import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Inline error notice, announced to assistive tech.
 *
 * `role="alert"` makes screen readers speak the message the moment it
 * renders — the app's plain error <div>s were silent. Styling matches the
 * existing magenta error boxes; override or extend via `className`.
 */
export function ErrorNote({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role="alert"
      className={cn(
        "border border-magenta/40 bg-magenta/5 px-4 py-3 font-mono text-xs text-magenta",
        className,
      )}
    >
      {children}
    </div>
  );
}
