import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, generateSlug, validateEmail, validatePassword } from '@/lib/auth-utils';

const signupSchema = z.object({
  companyName: z.string().min(2).max(255),
  industryId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  region: z.string().optional().default('za'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Check if industry exists
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

    // Generate unique slug for company
    let slug = generateSlug(data.companyName);
    let slugExists = true;
    let counter = 1;
    
    while (slugExists) {
      const { data: existingCompany } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!existingCompany) {
        slugExists = false;
      } else {
        slug = `${generateSlug(data.companyName)}-${counter}`;
        counter++;
      }
    }

    // Create company
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
      console.error('Company creation error:', companyError);
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create admin user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        company_id: company.id,
        email: data.email,
        password_hash: passwordHash,
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'admin',
      })
      .select()
      .single();

    if (userError || !user) {
      // Rollback: delete company if user creation fails
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      console.error('User creation error:', userError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Get all modules
    const { data: allModules } = await supabaseAdmin
      .from('modules')
      .select('*');

    // Enable default modules based on industry
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
    console.error('Signup error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
