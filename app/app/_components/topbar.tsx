"use client";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ConnectWallet } from "@/components/ui/connect-wallet";
import { NETWORK_NAME, useWallet } from "@/lib/wallet";
import { NETWORK_LABEL } from "@/components/ui/stellar-link";
import { focusRing } from "@/lib/ui";
import { useMobileNav } from "./mobile-nav-context";

// Display label for the configured network — "mainnet" | "testnet".

const titles: Record<string, { t: string; b: string[] }> = {
  "/app": { t: "Overview", b: ["console", "overview"] },
  "/app/agents": { t: "Agent Registry", b: ["console", "agents"] },
  "/app/orchestrator": { t: "Orchestrator", b: ["console", "orchestrator"] },
  "/app/trace": { t: "Trace", b: ["console", "trace"] },
  "/app/events": { t: "Events", b: ["console", "events"] },
  "/app/send": { t: "Send XLM", b: ["console", "send"] },
  "/app/flow": { t: "Flow", b: ["console", "flow"] },
  "/app/pdax": { t: "PDAX", b: ["console", "pdax"] },
  "/app/wallet": { t: "Wallet", b: ["console", "wallet"] },
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
  const {
    connected,
    xlmBalance,
    balanceLoading,
    walletNetwork,
    walletNetworkMismatch,
  } = useWallet();
  const { toggle } = useMobileNav();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg/70 backdrop-blur-xl px-4 md:px-8">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <button
            aria-label="open menu"
            onClick={toggle}
            className={`md:hidden flex items-center justify-center h-9 w-9 -ml-1 clip-cyber-sm border border-border hover:border-violet/60 hover:bg-violet/5 transition ${focusRing}`}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <nav className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted truncate">
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

        <div className="flex items-center gap-2 md:gap-4">
          {connected && (
            <div
              className="hidden sm:flex clip-cyber-sm border border-cyan/40 bg-cyan/5 h-8 px-3 items-center gap-2 font-mono text-[11px] text-cyan"
              title={`native XLM balance · ${NETWORK_LABEL}`}
            >
              <span className="opacity-60">◈</span>
              <span className="text-text">
                {balanceLoading && xlmBalance === null
                  ? "…"
                  : fmtXlm(xlmBalance)}
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
      {walletNetworkMismatch && (
        <div
          role="alert"
          className="sticky top-16 z-20 border-b border-magenta/50 bg-magenta/10 backdrop-blur-xl px-4 md:px-8 py-2 font-mono text-[11px] text-magenta"
        >
          ⚠ wrong network — your wallet is on{" "}
          <b>{walletNetwork?.network || "another network"}</b> but this app
          expects <b>{NETWORK_NAME}</b>. Switch networks in your wallet
          extension before signing.
        </div>
      )}
    </>
  );
}
