import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { isDevAdminLoginEnabled } from "@/lib/dev-admin-login";
import {
  ADMIN_SESSION_COOKIE,
  readSessionToken,
  signSession,
  type OperatorRole,
} from "@/lib/session-token";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 12 * 60 * 60,
};

export const getSession = cache(async () => {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return readSessionToken(token);
});

export async function getCurrentOperator() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function createSession(username: string, role: OperatorRole) {
  if (!isDevAdminLoginEnabled()) {
    throw new Error("Development admin sign-in is disabled in production.");
  }

  const token = await signSession(username, role);
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, token, cookieOptions);
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}
