"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectWallet } from "@/components/ui/connect-wallet";
import { useWallet } from "@/lib/wallet";

type StellarInfo = {
  network: string;
  rpc_url: string;
  network_passphrase: string;
  admin: string;
  contracts: Record<string, string>;
  asset: string;
  asset_sac: string;
};

export default function WalletPage() {
  const { connected, address, network } = useWallet();
  const [info, setInfo] = useState<StellarInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stellar/network")
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/stellar/network → ${r.status}`);
        return r.json();
      })
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, []);

  const networkMismatch =
    connected && info && network?.networkPassphrase !== info.network_passphrase;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Wallet</h1>
          <p className="mt-1 text-sm text-muted">
            Freighter → Stellar testnet. Sign Orizon contract calls with your key.
          </p>
        </div>
        <ConnectWallet size="md" />
      </div>

      {networkMismatch && (
        <div className="clip-cyber-sm border border-magenta/50 bg-magenta/5 p-4 font-mono text-xs text-magenta">
          ⚠ your wallet is on <b>{network?.network}</b> but Orizon deployed to{" "}
          <b>{info?.network}</b>. Switch networks in the Freighter extension.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-4">
            Your session
          </div>
          {connected ? (
            <dl className="space-y-3 text-sm font-mono">
              <Row k="address" v={address ?? ""} />
              <Row k="network" v={network?.network ?? ""} />
              <Row k="passphrase" v={network?.networkPassphrase ?? ""} />
            </dl>
          ) : (
            <div className="text-sm text-muted">
              No wallet connected. Click <b className="text-text">Connect Wallet</b>{" "}
              above to link Freighter.
            </div>
          )}
        </Card>

        <Card>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet mb-4">
            Orizon deploy ({info?.network ?? "…"})
          </div>
          {error && (
            <div className="text-sm text-magenta mb-3 font-mono">
              backend offline — {error}
            </div>
          )}
          {info ? (
            <dl className="space-y-3 text-sm font-mono">
              <Row k="rpc" v={info.rpc_url} />
              <Row k="admin" v={info.admin} />
              <Row k="asset" v={`${info.asset} (${info.asset_sac.slice(0, 8)}…)`} />
            </dl>
          ) : (
            !error && <div className="text-sm text-muted">loading…</div>
          )}
        </Card>
      </div>

      <Card>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-5">
          Deployed contracts
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {info
            ? Object.entries(info.contracts).map(([name, id]) => (
                <a
                  key={name}
                  href={`https://stellar.expert/explorer/${info.network}/contract/${id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="clip-cyber-sm border border-border bg-bg/40 p-4 hover:border-violet/60 hover:bg-violet/5 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{pretty(name)}</span>
                    <Badge tone="cyan">live</Badge>
                  </div>
                  <div className="font-mono text-[11px] text-muted break-all">{id}</div>
                  <div className="mt-2 font-mono text-[10px] text-cyan">
                    view on stellar.expert ▸
                  </div>
                </a>
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="clip-cyber-sm border border-border bg-bg/40 p-4 h-20 animate-pulse"
                />
              ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-2 last:border-0">
      <dt className="text-muted text-[10px] uppercase tracking-widest pt-1">{k}</dt>
      <dd className="text-right break-all text-text">{v}</dd>
    </div>
  );
}

function pretty(s: string) {
  return s
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
