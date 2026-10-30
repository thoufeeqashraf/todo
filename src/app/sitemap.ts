import type { MetadataRoute } from "next";

import { getSiteUrl, indexablePaths } from "@/lib/seo";

const lastModified = new Date("2026-10-30T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();

  return indexablePaths.map((entry) => ({
    url: entry.path === "/" ? `${origin}/` : `${origin}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
