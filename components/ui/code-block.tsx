import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function CodeBlock({
  title = "orizon.sh",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "clip-cyber border border-border bg-[#070010] font-mono text-xs overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-surface/70">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-magenta/70" />
          <span className="h-2 w-2 rounded-full bg-violet/70" />
          <span className="h-2 w-2 rounded-full bg-cyan/70" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted">
          {title}
        </span>
        <span className="text-[10px] font-mono text-muted">◉ live</span>
      </div>
      <pre className="px-4 py-4 leading-6 text-text/90 whitespace-pre-wrap">
        {children}
      </pre>
    </div>
  );
}
