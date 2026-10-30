"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { SystemScreen } from "@/components/system/system-screen";
import { Button } from "@/components/ui/button";
import { siteName } from "@/lib/seo";

export function ErrorState({
  reset,
  digest,
}: {
  reset?: () => void;
  digest?: string;
}) {
  return (
    <SystemScreen
      kicker="Something went wrong"
      title="This screen did not finish loading"
      description={`${siteName} hit a snag while opening this page. Nothing was removed. Try again, and if it keeps happening, go home and open the screen from there.`}
      actions={
        <>
          {reset ? (
            <Button type="button" size="lg" onClick={() => reset()}>
              <RotateCcw />
              Try again
            </Button>
          ) : null}
          <Link href="/">
            <Button type="button" size="lg" variant="outline">
              Go home
            </Button>
          </Link>
        </>
      }
      footnote={digest ? `Reference ${digest}` : undefined}
    />
  );
}
