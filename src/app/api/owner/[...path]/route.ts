import { NextRequest } from 'next/server';

import { ownerApi } from '@/lib/owner/access';

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }, method: string) {
  const { path } = await context.params;
  return ownerApi(request, method, path);
}

export function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context, 'GET');
}

export function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context, 'POST');
}

export function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context, 'PATCH');
}
