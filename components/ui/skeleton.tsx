import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm bg-white/5 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-violet/10 before:to-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

/**
 * Screen-reader-only live region announcing that content is loading.
 * Skeleton blocks stay aria-hidden; render this once alongside them so
 * assistive tech hears the loading state.
 */
export function LoadingStatus({ label = "Loading…" }: { label?: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}
