import type { MetadataRoute } from "next";

import {
  brandColor,
  manifestBackgroundColor,
  siteDescription,
  siteName,
  siteShortName,
} from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteShortName,
    description: siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: manifestBackgroundColor,
    theme_color: brandColor,
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
