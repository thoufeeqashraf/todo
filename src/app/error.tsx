'use client';

import { Button } from '@/components/ui/button';
import { ConfigNotice } from '@/components/config-notice';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-canvas mx-auto flex min-h-svh w-full max-w-lg items-center px-6 py-16">
      <ConfigNotice
        title="This page could not load"
        body="A setting is missing, or the request failed. The details stay on the server."
        action={<Button onClick={() => reset()}>Try again</Button>}
      />
    </main>
  );
}
