import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCustomerSession, setCustomerToken } from '@/lib/customer-session';
import { PlatformError } from '@/lib/platform-error';
import { loginWithPassword } from '@/lib/services/tenant';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companySlug: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);
    const issued = await loginWithPassword(data.email, data.password, data.companySlug);
    await setCustomerToken(issued.token);
    const session = await getCustomerSession();
    return NextResponse.json({
      success: true,
      user: session
        ? {
            id: session.user.id,
            email: session.user.email,
            firstName: session.user.first_name,
            lastName: session.user.last_name,
            role: session.user.role,
          }
        : null,
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    if (error instanceof PlatformError) {
      return NextResponse.json({ error: error.message, code: error.code, ...error.details }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
