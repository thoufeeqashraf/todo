import { BrandMark } from "@/components/system/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { siteName } from "@/lib/seo";

export function LoadingState() {
  return (
    <div
      className="app-canvas flex min-h-svh items-center justify-center px-6 py-16"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <BrandMark className="size-12" />
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-tight">{siteName}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Opening your workspace. The next screen will be here in a moment.
          </p>
        </div>
        <div className="w-full space-y-2 rounded-xl bg-card/80 p-4 ring-1 ring-foreground/10">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mx-auto h-3 w-4/5" />
          <Skeleton className="mx-auto h-3 w-2/3" />
        </div>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
