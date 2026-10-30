import type { Metadata } from 'next';

import { AuthShell } from '@/components/marketing/auth-shell';
import { ConfigNotice } from '@/components/config-notice';
import { isDevAdminLoginEnabled } from '@/lib/dev-admin-login';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Operator sign in · ToDo App',
  description: 'Sign in to the admin or staff dashboard.',
};

export default function LoginPage() {
  return (
    <AuthShell
      kicker="Platform operators"
      title="Control the app customers use."
      body="Development only. Any username and password enters. Choose Admin or Staff. This gate is removed before go-live."
      points={[
        'Separate from a customer company',
        'Admin or staff, then the operator dashboard',
        'Closed when the site is in production',
      ]}
    >
      {isDevAdminLoginEnabled() ? <LoginForm /> : <LiveSignInClosed />}
    </AuthShell>
  );
}

function LiveSignInClosed() {
  return (
    <ConfigNotice
      title="Admin sign in"
      body="Sign-in is closed on the live site. Development access has been removed."
    />
  );
}
