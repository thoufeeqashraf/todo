import { isDevAdminLoginEnabled } from "@/lib/dev-admin-login";

export const ADMIN_SESSION_COOKIE = "admin_session";

export type OperatorRole = "admin" | "staff";

export type AdminSession = {
  username: string;
  role: OperatorRole;
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let signingKey: Promise<CryptoKey> | null = null;

function getSigningKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }

  signingKey ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  return signingKey;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  if (!/^[\w-]+$/.test(value)) {
    return null;
  }

  const padded =
    value.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (value.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

export async function signSession(username: string, role: OperatorRole) {
  if (!isDevAdminLoginEnabled()) {
    throw new Error("Development admin sign-in is disabled in production.");
  }

  const payload: AdminSession = {
    username,
    role,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await getSigningKey(),
      encoder.encode(encodedPayload),
    ),
  );

  return `${encodedPayload}.${toBase64Url(signature)}`;
}

export async function readSessionToken(token: string | undefined) {
  if (!token || !isDevAdminLoginEnabled()) {
    return null;
  }

  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) {
    return null;
  }

  const signature = fromBase64Url(encodedSignature);
  const payloadBytes = fromBase64Url(encodedPayload);
  if (!signature || !payloadBytes) {
    return null;
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    await getSigningKey(),
    signature,
    encoder.encode(encodedPayload),
  );
  if (!valid) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(decoder.decode(payloadBytes));
    if (!isAdminSession(payload)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function isAdminSession(value: unknown): value is AdminSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<AdminSession>;
  return (
    typeof session.username === "string" &&
    session.username.length > 0 &&
    session.username.length <= 80 &&
    (session.role === "admin" || session.role === "staff") &&
    typeof session.exp === "number" &&
    session.exp > Date.now()
  );
}
