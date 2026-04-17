"use client";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const titles: Record<string, { t: string; b: string[] }> = {
  "/app": { t: "Overview", b: ["console", "overview"] },
  "/app/agents": { t: "Agent Registry", b: ["console", "agents"] },
  "/app/orchestrator": { t: "Orchestrator", b: ["console", "orchestrator"] },
  "/app/trace": { t: "Trace", b: ["console", "trace"] },
  "/app/flow": { t: "Flow", b: ["console", "flow"] },
};

export function Topbar() {
  const pathname = usePathname();
  const meta = titles[pathname] ?? { t: "Console", b: ["console"] };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg/70 backdrop-blur-xl px-8">
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          {meta.b.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-violet">/</span>}
              <span className={i === meta.b.length - 1 ? "text-text" : ""}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button className="clip-cyber-sm flex h-9 items-center gap-3 border border-border bg-surface/60 px-3 font-mono text-[11px] text-muted hover:text-text hover:border-violet/60 transition">
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Search agents, tasks…</span>
          <span className="ml-4 border border-border px-1.5 text-[9px]">⌘K</span>
        </button>
        <Badge tone="success" dot>
          live
        </Badge>
      </div>
    </header>
  );
}
