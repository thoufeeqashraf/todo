import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword } from '@/utils/auth';
import { cookies } from 'next/headers';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  isOperator: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    if (data.isOperator) {
      // Operator login
      const { data: operator, error: operatorError } = await supabaseAdmin
        .from('operator_users')
        .select('*')
        .eq('email', data.email)
        .eq('is_active', true)
        .single();

      if (operatorError || !operator) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(data.password, operator.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Create session token (simplified for development)
      const sessionToken = Buffer.from(
        JSON.stringify({
          userId: operator.id,
          email: operator.email,
          type: 'operator',
          timestamp: Date.now(),
        })
      ).toString('base64');

      const cookieStore = await cookies();
      cookieStore.set('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json({
        success: true,
        user: {
          id: operator.id,
          email: operator.email,
          name: operator.name,
          type: 'operator',
        },
      });
    } else {
      // Regular user login
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('email', data.email)
        .eq('is_active', true)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(data.password, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Create session token (simplified for development)
      const sessionToken = Buffer.from(
        JSON.stringify({
          userId: user.id,
          email: user.email,
          companyId: user.company_id,
          type: 'user',
          timestamp: Date.now(),
        })
      ).toString('base64');

      const cookieStore = await cookies();
      cookieStore.set('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          companyId: user.company_id,
          type: 'user',
        },
      });
    }
  } catch (error) {
    console.error('Login error:', error);
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
