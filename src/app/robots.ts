import type { MetadataRoute } from "next";

import { getSiteUrl, robotsDisallow } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...robotsDisallow],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
