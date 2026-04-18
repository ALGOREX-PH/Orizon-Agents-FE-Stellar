"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/app",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <rect x="2" y="2" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="4" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="8" width="7" height="10" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/app/agents",
    label: "Agents",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/app/orchestrator",
    label: "Orchestrator",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="4" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="4" cy="16" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 5l4 4M15 5l-4 4M5 15l4-4M15 15l-4-4" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    href: "/app/trace",
    label: "Trace",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path d="M3 5h14M3 10h10M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="15" cy="10" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/app/wallet",
    label: "Wallet",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <rect x="2" y="5" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="12" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/app/flow",
    label: "Flow",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <circle cx="3" cy="5" r="1.5" fill="currentColor" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
        <circle cx="3" cy="15" r="1.5" fill="currentColor" />
        <circle cx="17" cy="10" r="1.5" fill="currentColor" />
        <path d="M4.5 5L9 9M4.5 15L9 11M11 10L15.5 10" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-surface/60 backdrop-blur-xl">
      <div className="flex h-16 items-center px-5 border-b border-border">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          workspace
        </div>
        {items.map((item) => {
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-violet/10 text-text"
                  : "text-muted hover:text-text hover:bg-white/5",
              )}
            >
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-0.5 bg-violet shadow-[0_0_10px_#B026FF]" />
              )}
              <span className={active ? "text-violet" : ""}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="clip-cyber border border-border bg-bg/60 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_8px_#00FFD1]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">
              network
            </span>
          </div>
          <div className="font-mono text-[11px] text-muted leading-5">
            2,481 agents online
            <br />
            avg latency 212ms
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 px-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet to-magenta grid place-items-center font-mono text-xs">
            ◆
          </div>
          <div className="flex-1">
            <div className="text-xs">danielle.meer</div>
            <div className="font-mono text-[10px] text-muted">ops·free</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
