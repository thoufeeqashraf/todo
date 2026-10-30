import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_ANON = 'placeholder-anon-key';
const PLACEHOLDER_SERVICE = 'placeholder-service-key';

function envOrPlaceholder(name: string, placeholder: string) {
  const value = process.env[name];
  return value && value.length > 0 ? value : placeholder;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url.startsWith('https://') || !key) return false;
  const marker = `${url} ${key}`.toLowerCase();
  return !marker.includes('placeholder') && !marker.includes('your_supabase') && !marker.includes('your-project');
}

function lazyClient(factory: () => SupabaseClient): SupabaseClient {
  let client: SupabaseClient | null = null;
  return new Proxy({} as SupabaseClient, {
    get(_target, property) {
      client ??= factory();
      const value = client[property as keyof SupabaseClient];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}

// Clients are created on first use so a missing env does not run during import or build.
export const supabase = lazyClient(() =>
  createClient(
    envOrPlaceholder('NEXT_PUBLIC_SUPABASE_URL', PLACEHOLDER_URL),
    envOrPlaceholder('NEXT_PUBLIC_SUPABASE_ANON_KEY', PLACEHOLDER_ANON),
  ),
);

export const supabaseAdmin = lazyClient(() =>
  createClient(
    envOrPlaceholder('NEXT_PUBLIC_SUPABASE_URL', PLACEHOLDER_URL),
    envOrPlaceholder('SUPABASE_SERVICE_ROLE_KEY', PLACEHOLDER_SERVICE),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  ),
);
