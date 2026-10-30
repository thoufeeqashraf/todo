/**
 * Public site constants for icons, the web manifest, robots, the sitemap,
 * and Open Graph. Root layout metadata stays where it is; these routes read
 * this file instead of editing that layout.
 */

export const siteName = "ToDo App";

export const siteShortName = "ToDo";

export const siteDescription =
  "ToDo App is the workplace console for company tasks, proof of work, and hierarchy.";

export const siteTagline = "Company tasks, proof of work, and hierarchy.";

/** Brand indigo used by generated icons and the manifest theme color. */
export const brandColor = "#3A49C6";

export const brandColorDeep = "#2C3BB5";

export const manifestBackgroundColor = "#ffffff";

export const openGraphAlt = "ToDo App — company tasks, proof of work, and hierarchy.";

export const indexablePaths = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.8 },
  { path: "/customer-login", changeFrequency: "monthly", priority: 0.6 },
] as const;

/** Private or development-only areas. Crawlers may still fetch public pages. */
export const robotsDisallow = [
  "/api/",
  "/dashboard",
  "/customer",
  "/invite",
  "/login",
] as const;

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) {
    return `https://${production.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}
