"use client";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ConnectWallet } from "@/components/ui/connect-wallet";
import { useWallet } from "@/lib/wallet";
import { useMobileNav } from "./mobile-nav-context";

const titles: Record<string, { t: string; b: string[] }> = {
  "/app": { t: "Overview", b: ["console", "overview"] },
  "/app/agents": { t: "Agent Registry", b: ["console", "agents"] },
  "/app/orchestrator": { t: "Orchestrator", b: ["console", "orchestrator"] },
  "/app/trace": { t: "Trace", b: ["console", "trace"] },
  "/app/events": { t: "Events", b: ["console", "events"] },
  "/app/send": { t: "Send XLM", b: ["console", "send"] },
  "/app/flow": { t: "Flow", b: ["console", "flow"] },
};

function fmtXlm(b: string | null): string {
  if (b === null) return "—";
  const n = parseFloat(b);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(4);
}

export function Topbar() {
  const pathname = usePathname();
  const meta = titles[pathname] ?? { t: "Console", b: ["console"] };
  const { connected, xlmBalance, balanceLoading } = useWallet();

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
        {connected && (
          <div
            className="clip-cyber-sm border border-cyan/40 bg-cyan/5 h-8 px-3 flex items-center gap-2 font-mono text-[11px] text-cyan"
            title="native XLM balance · testnet"
          >
            <span className="opacity-60">◈</span>
            <span className="text-text">
              {balanceLoading && xlmBalance === null ? "…" : fmtXlm(xlmBalance)}
            </span>
            <span className="opacity-70 uppercase tracking-[0.22em] text-[9px]">
              xlm
            </span>
          </div>
        )}
        <ConnectWallet />
        <Badge tone="success" dot>
          live
        </Badge>
      </div>
    </header>
  );
}
