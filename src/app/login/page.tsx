import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { ConfigNotice } from "@/components/config-notice";
import { isDevAdminLoginEnabled } from "@/lib/dev-admin-login";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Operator sign in",
  description: "Sign in to the admin or staff dashboard.",
};

export default function LoginPage() {
  return (
    <div className="app-canvas flex min-h-svh flex-col">
      <header className="glass flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">Workplace</Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        {isDevAdminLoginEnabled() ? <LoginForm /> : <LiveSignInClosed />}
      </main>
    </div>
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
