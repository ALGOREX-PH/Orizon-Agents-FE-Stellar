import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  glow = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { glow?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "glow-card clip-cyber relative border border-border bg-surface/60 backdrop-blur-sm p-6",
        glow && "shadow-neon-violet",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet/5 via-transparent to-cyan/5" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function CardCorner() {
  return (
    <>
      <span className="pointer-events-none absolute -top-px -left-px h-3 w-3 border-t border-l border-cyan/70" />
      <span className="pointer-events-none absolute -top-px -right-px h-3 w-3 border-t border-r border-cyan/70" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-cyan/70" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b border-r border-cyan/70" />
    </>
  );
}
