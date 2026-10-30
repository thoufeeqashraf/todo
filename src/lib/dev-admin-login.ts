/**
 * Development-only operator sign-in.
 * Any username and password enters the admin dashboard.
 * Delete this module before go-live. Production never enables it.
 */
export function isDevAdminLoginEnabled() {
  return process.env.NODE_ENV !== "production";
}
