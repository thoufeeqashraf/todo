import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../../..');

const testStubs = {
  'server-only': 'tests/stubs/empty.ts',
  'next/headers': 'tests/stubs/next-headers.ts',
  'next/navigation': 'tests/stubs/next-navigation.ts',
};

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/supabase' || specifier === '@/lib/supabase.ts') {
    return nextResolve(pathToFileURL(path.join(root, 'tests/stubs/supabase.ts')).href, context);
  }
  const stub = testStubs[specifier];
  if (stub) return nextResolve(pathToFileURL(path.join(root, stub)).href, context);
  if (specifier === 'next/server') return nextResolve('next/server.js', context);
  if (specifier.startsWith('@/')) {
    const base = path.join(root, 'src', specifier.slice(2));
    const file = ['.ts', '.tsx', '.mjs', '.js'].map((ext) => base + ext).find((candidate) => existsSync(candidate))
      ?? [path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.js')].find((candidate) => existsSync(candidate))
      ?? base;
    return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}
