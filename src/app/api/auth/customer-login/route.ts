import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCustomerSession, setCustomerToken } from '@/lib/customer-session';
import { jsonFromError } from '@/lib/json-error';
import { enforceAuthLogin, readJson } from '@/lib/request-guards';
import { loginWithPassword } from '@/lib/services/tenant';

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
  companySlug: z.string().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    enforceAuthLogin(request);
    const body = await readJson(request);
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
    return jsonFromError(error, 'Login error');
  }
}
