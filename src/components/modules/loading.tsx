import { Skeleton } from '@/components/ui/skeleton';

export function ModuleLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-72 rounded-lg" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function Loading() {
  return <ModuleLoading />;
}
