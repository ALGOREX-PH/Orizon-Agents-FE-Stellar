import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6"
      role="status"
      aria-label="Loading"
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted animate-pulse">
        // loading console
      </span>
      <div className="w-full max-w-md space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}
