import Link from "next/link";

import { SystemScreen } from "@/components/system/system-screen";
import { Button } from "@/components/ui/button";
import { siteName } from "@/lib/seo";

export function NotFoundState() {
  return (
    <SystemScreen
      kicker="404"
      title="This page is not on the list"
      description={`That address does not match a screen in ${siteName}. The link may be old, or the page may have moved. Head home and continue from there.`}
      actions={
        <>
          <Link href="/">
            <Button size="lg">Go home</Button>
          </Link>
          <Link href="/customer-login">
            <Button size="lg" variant="outline">
              Customer sign in
            </Button>
          </Link>
        </>
      }
    />
  );
}
