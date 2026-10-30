import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3107);
const baseURL = `http://127.0.0.1:${port}`;

function serverEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') env[key] = value;
  }
  env.NODE_ENV = 'production';
  env.PORT = String(port);
  // Smoke must pass with no real Supabase project. Empty values stay unset for the app.
  env.NEXT_PUBLIC_SUPABASE_URL = '';
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
  env.SUPABASE_SERVICE_ROLE_KEY = '';
  return env;
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? 'github' : 'list',
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run start -- -H 127.0.0.1 -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: serverEnv(),
  },
});
