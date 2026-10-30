import { NextResponse } from 'next/server';

import { webError } from '@/lib/request-guards';

export function jsonFromError(error: unknown, logLabel: string) {
  const mapped = webError(error);
  if (mapped) return NextResponse.json(mapped.body, { status: mapped.status, headers: mapped.headers });
  const summary = error instanceof Error ? `${error.name}: ${error.message.slice(0, 200)}` : 'unknown';
  console.error(logLabel, summary);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
