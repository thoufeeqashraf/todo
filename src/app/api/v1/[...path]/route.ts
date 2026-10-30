import { NextRequest } from 'next/server';

import { dispatch } from '@/lib/api-v1';

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return dispatch(request, path, request.method);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
