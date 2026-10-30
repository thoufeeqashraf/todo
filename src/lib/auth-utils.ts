import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (password.length > 200) {
    return { valid: false, message: 'Password must be at most 200 characters' };
  }
  return { valid: true };
}

const MAX_SLUG_ATTEMPTS = 25;

export function slugCandidate(name: string, attempt: number): string | null {
  if (!Number.isInteger(attempt) || attempt < 0 || attempt >= MAX_SLUG_ATTEMPTS) return null;
  const base = generateSlug(name).slice(0, 90).replace(/-+$/g, '');
  if (!base) return null;
  const slug = attempt === 0 ? base : `${base}-${attempt}`;
  return slug.length <= 100 ? slug : null;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
