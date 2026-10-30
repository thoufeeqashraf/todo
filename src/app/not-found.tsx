import type { Metadata } from "next";

import { NotFoundState } from "@/components/system/not-found-state";
import { siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Page not found · ${siteName}`,
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundState />;
}
