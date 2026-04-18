"use client";
import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function ConnectWallet({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const { connected, installed, address, network, connect, disconnect, loading, error } =
    useWallet();

  if (connected && address) {
    const wrongNet =
      network?.network && !network.network.toUpperCase().includes("TEST");
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge tone={wrongNet ? "magenta" : "cyan"} dot>
          {wrongNet ? "wrong net" : network?.network?.toLowerCase() || "stellar"}
        </Badge>
        <button
          onClick={disconnect}
          title={address}
          className="clip-cyber-sm border border-violet/60 bg-violet/10 h-8 px-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text hover:border-violet hover:shadow-neon-violet transition"
        >
          ◆ {short(address)}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {error && !installed && (
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-magenta hover:text-text"
        >
          install freighter ▸
        </a>
      )}
      <Button size={size} variant="primary" onClick={connect} disabled={loading}>
        {loading ? "◉ …" : "Connect Wallet"}
      </Button>
    </div>
  );
}
