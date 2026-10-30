import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthShell } from '@/components/marketing/auth-shell';
import { Skeleton } from '@/components/ui/skeleton';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in · ToDo App',
  description: 'Customer entrance for one company.',
};

export default function CustomerLoginPage() {
  return (
    <AuthShell
      kicker="Customer entrance"
      title="Sign in to the company you run."
      body="This door is for one company. It is not the operator gate."
      points={[
        'Tasks, people, and the modules for your tenant',
        'The same account the web console checks',
        'Operators use a separate development gate',
      ]}
    >
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
