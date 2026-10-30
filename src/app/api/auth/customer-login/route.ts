import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword } from '@/lib/auth-utils';
import { setCustomerSession } from '@/lib/customer-session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    // Find user by email
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('*, companies(*)')
      .eq('email', data.email)
      .eq('is_active', true);

    if (userError || !users || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Support multiple companies with same email (different tenants)
    // For now, take the first match
    const user = users[0];

    // Verify password
    const passwordValid = await verifyPassword(data.password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Set session
    await setCustomerSession({
      user: {
        id: user.id,
        company_id: user.company_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      companyId: user.company_id,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
      company: {
        id: user.companies.id,
        name: user.companies.name,
        slug: user.companies.slug,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
