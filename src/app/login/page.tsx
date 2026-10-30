import type { Metadata } from "next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isDevAdminLoginEnabled } from "@/lib/dev-admin-login";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Operator sign in",
  description: "Sign in to the admin or staff dashboard.",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      {isDevAdminLoginEnabled() ? <LoginForm /> : <LiveSignInClosed />}
    </main>
  );
}

function LiveSignInClosed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Admin sign in</h1>
        </CardTitle>
        <CardDescription>
          Sign-in is closed on the live site. Development access has been
          removed.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
