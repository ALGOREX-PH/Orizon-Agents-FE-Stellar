import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/ui";

/**
 * Inline error notice, announced to assistive tech.
 *
 * `role="alert"` makes screen readers speak the message the moment it
 * renders — the app's plain error <div>s were silent. Styling matches the
 * existing magenta error boxes; override or extend via `className`.
 *
 * Pass `onRetry` to render a retry control alongside the message. Almost every
 * failure in this console is transient (a sleeping backend, a slow RPC), so a
 * dead-end error box strands the user on a page that would work on a second
 * attempt.
 */
export function ErrorNote({
  id,
  className,
  onRetry,
  retryLabel = "retry",
  retrying = false,
  children,
}: {
  id?: string;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role="alert"
      className={cn(
        "border border-magenta/40 bg-magenta/5 px-4 py-3 font-mono text-xs text-magenta",
        onRetry && "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <span>{children}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className={cn(
            "shrink-0 border border-magenta/50 px-3 py-1 uppercase tracking-[0.2em]",
            "transition-colors hover:bg-magenta/15 disabled:opacity-50",
            focusRing,
          )}
        >
          {retrying ? "retrying…" : retryLabel}
        </button>
      )}
    </div>
  );
}
