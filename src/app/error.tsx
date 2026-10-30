"use client";

import { ErrorState } from "@/components/system/error-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState reset={reset} digest={error.digest} />;
}
