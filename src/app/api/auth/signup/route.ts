import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { hashPassword, slugCandidate, validateEmail, validatePassword } from '@/lib/auth-utils';
import { PlatformError } from '@/lib/platform-error';
import { jsonFromError } from '@/lib/json-error';
import { enforceAuthSignup, readJson } from '@/lib/request-guards';
import { writeAudit } from '@/lib/services/tenant';

const signupSchema = z.object({
  companyName: z.string().min(2).max(255),
  industryId: z.string().uuid(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  region: z.enum(['za', 'eu', 'multi']).optional().default('za'),
});

export async function POST(request: NextRequest) {
  try {
    enforceAuthSignup(request);
    const body = await readJson(request);
    const data = signupSchema.parse(body);

    if (!validateEmail(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    if (!slugCandidate(data.companyName, 0)) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      throw new PlatformError(
        'not_configured',
        'Database is not configured. Set the Supabase URL, anon key, and service role, then apply migrations 001–003.',
        503,
      );
    }

    const { data: industry, error: industryError } = await supabaseAdmin
      .from('industries')
      .select('*')
      .eq('id', data.industryId)
      .single();

    if (industryError || !industry) {
      return NextResponse.json(
        { error: 'Invalid industry selected' },
        { status: 400 }
      );
    }

    let slug: string | null = null;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const candidate = slugCandidate(data.companyName, attempt);
      if (!candidate) break;
      const { data: existingCompany, error: slugError } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();
      if (slugError) {
        console.error('Signup slug lookup failed');
        return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
      }
      if (!existingCompany) {
        slug = candidate;
        break;
      }
    }

    if (!slug) {
      return NextResponse.json({ error: 'Could not reserve a company address.' }, { status: 409 });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: data.companyName,
        slug,
        industry_id: data.industryId,
        region: data.region,
      })
      .select()
      .single();

    if (companyError || !company) {
      console.error('Company creation error');
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      );
    }

    const passwordHash = await hashPassword(data.password);

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        company_id: company.id,
        email: data.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'admin',
      })
      .select()
      .single();

    if (userError || !user) {
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      console.error('User creation error');
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    const { data: allModules } = await supabaseAdmin
      .from('modules')
      .select('*');

    if (allModules && industry.default_modules) {
      const defaultModuleNames = industry.default_modules as string[];
      const modulesToEnable = allModules.filter((module) =>
        defaultModuleNames.includes(module.name)
      );

      if (modulesToEnable.length > 0) {
        const companyModules = modulesToEnable.map((module) => ({
          company_id: company.id,
          module_id: module.id,
          is_enabled: true,
        }));

        await supabaseAdmin.from('company_modules').insert(companyModules);
      }
    }

    await writeAudit(
      { userId: user.id, companyId: company.id },
      'company.created',
      'company',
      company.id,
      { industryId: data.industryId, region: data.region },
    );

    return NextResponse.json(
      {
        success: true,
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonFromError(error, 'Signup error');
  }
}
