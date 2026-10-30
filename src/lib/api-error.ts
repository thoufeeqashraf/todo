import { z } from 'zod';

import { PlatformError } from '@/lib/platform-error';

export function errorBody(error: unknown): { status: number; body: { error: Record<string, unknown> } } {
  if (error instanceof PlatformError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message, ...(error.details ?? {}) } },
    };
  }
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'invalid',
          message: 'Invalid input.',
          issues: error.issues,
        },
      },
    };
  }
  return { status: 500, body: { error: { code: 'internal', message: 'Internal server error.' } } };
}
