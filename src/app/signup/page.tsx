import type { Metadata } from 'next';

import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Create a company · ToDo App',
  description: 'Create a company, choose an industry, and add the first admin.',
};

export default function SignupPage() {
  return <SignupForm />;
}
