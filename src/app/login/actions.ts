"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isDevAdminLoginEnabled } from "@/lib/dev-admin-login";
import { enforceAuthLogin, webError } from "@/lib/request-guards";
import { clearSession, createSession } from "@/lib/session";
import type { OperatorRole } from "@/lib/session-token";

export type SignInState = { error?: string } | undefined;

export async function signIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!isDevAdminLoginEnabled()) {
    return { error: "Sign-in is closed on the live site." };
  }

  try {
    enforceAuthLogin({ headers: await headers() });
  } catch (error) {
    const mapped = webError(error);
    if (mapped) return { error: mapped.body.error };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username) {
    return { error: "Enter a username." };
  }

  if (username.length > 80) {
    return { error: "Use a username of 80 characters or fewer." };
  }

  // Development only: any password is accepted. Remove before go-live.
  if (password.length > 1024) {
    return { error: "Use a shorter password." };
  }

  const role: OperatorRole =
    formData.get("role") === "staff" ? "staff" : "admin";
  try {
    await createSession(username, role);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SESSION_SECRET")) {
      return { error: "Operator sign-in is not configured. Set SESSION_SECRET." };
    }
    if (message.includes("disabled in production")) {
      return { error: "Sign-in is closed on the live site." };
    }
    return { error: "Sign-in could not start." };
  }
  redirect("/dashboard");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
