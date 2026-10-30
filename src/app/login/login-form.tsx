"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signIn, type SignInState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    undefined,
  );

  return (
    <Card className="bg-card/85 shadow-lg shadow-primary/5">
      <CardHeader>
        <CardTitle>
          <h1>Operator sign in</h1>
        </CardTitle>
        <CardDescription>
          Development only. Any username and password enters. Choose Admin or
          Staff. This gate is removed before go-live.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Enter as</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center justify-center rounded-lg border border-input bg-card px-2.5 py-2 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                <input
                  className="sr-only"
                  type="radio"
                  name="role"
                  value="admin"
                  defaultChecked
                />
                Admin
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-lg border border-input bg-card px-2.5 py-2 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                <input className="sr-only" type="radio" name="role" value="staff" />
                Staff
              </label>
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              required
              maxLength={80}
              aria-invalid={state?.error ? true : undefined}
              aria-describedby={state?.error ? "login-error" : undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={1024}
              aria-invalid={state?.error ? true : undefined}
              aria-describedby={state?.error ? "login-error" : undefined}
            />
          </div>
          {state?.error ? (
            <p id="login-error" role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Company admins use customer sign-in, not this gate.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
