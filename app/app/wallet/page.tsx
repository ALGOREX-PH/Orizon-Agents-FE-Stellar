"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectWallet } from "@/components/ui/connect-wallet";
import { ErrorNote } from "@/components/ui/error-note";
import { NETWORK_NAME, useWallet } from "@/lib/wallet";
import { KVRow } from "@/components/ui/kv-row";
import {
  StellarExpertLink,
  defaultExplorerNetwork,
  stellarExpertUrl,
} from "@/components/ui/stellar-link";
import { getStellarNetwork } from "@/lib/api";
import { focusRing } from "@/lib/ui";
import { useFetch } from "@/lib/use-fetch";
import { prettyName } from "@/lib/utils";

// Display label for the configured network — "mainnet" | "testnet".
const NETWORK_LABEL = defaultExplorerNetwork === "public" ? "mainnet" : "testnet";

export default function WalletPage() {
  const {
    connected,
    address,
    network,
    walletNetwork,
    xlmBalance,
    balanceLoading,
    refreshBalance,
  } = useWallet();
  const { data: info, error } = useFetch(getStellarNetwork, []);

  // Compare the network the wallet itself reported against the backend's
  // deploy. Wallets that can't report a network (walletNetwork null) show
  // no warning — unknown is not a mismatch.
  const networkMismatch =
    connected &&
    info &&
    walletNetwork &&
    walletNetwork.networkPassphrase !== info.network_passphrase;

  // Prefer the wallet-reported network for session display; fall back to
  // this build's configured network when the wallet didn't report one.
  const sessionNetwork = walletNetwork ?? network;

  const balanceFmt =
    xlmBalance === null ? "—" : parseFloat(xlmBalance).toFixed(7);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Wallet</h1>
          <p className="mt-1 text-sm text-muted">
            Freighter → Stellar {NETWORK_LABEL}. Sign Orizon contract calls with your key.
          </p>
        </div>
        <ConnectWallet size="md" />
      </div>

      {networkMismatch && (
        <ErrorNote className="clip-cyber-sm border-magenta/50 p-4">
          ⚠ your wallet is on <b>{walletNetwork?.network || "another network"}</b>{" "}
          but Orizon deployed to <b>{info?.network}</b>. Switch networks in your
          wallet extension.
        </ErrorNote>
      )}

      {connected && (
        <Card glow>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-2">
                ▸ native XLM balance
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-semibold tracking-tight tabular-nums">
                  {balanceLoading && xlmBalance === null ? "…" : balanceFmt}
                </span>
                <span className="font-mono text-sm uppercase tracking-[0.2em] text-cyan">
                  XLM
                </span>
              </div>
              <div className="mt-2 font-mono text-[11px] text-muted">
                {address ? `${address.slice(0, 6)}…${address.slice(-6)}` : ""} ·{" "}
                {sessionNetwork?.network ?? NETWORK_NAME}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {defaultExplorerNetwork !== "public" && (
                <a
                  href="https://friendbot.stellar.org"
                  target="_blank"
                  rel="noreferrer"
                  className={`clip-cyber-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-text hover:border-cyan/60 transition ${focusRing}`}
                  title="Fund this account with testnet XLM via Friendbot"
                >
                  ▸ fund testnet
                </a>
              )}
              {address && (
                <StellarExpertLink
                  kind="account"
                  id={address}
                  className={`clip-cyber-sm border border-border px-3 py-1.5 text-muted hover:border-violet/60 transition ${focusRing}`}
                />
              )}
              <button
                onClick={() => refreshBalance()}
                disabled={balanceLoading}
                className={`clip-cyber-sm border border-cyan/60 bg-cyan/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan hover:bg-cyan/20 disabled:opacity-50 transition ${focusRing}`}
              >
                {balanceLoading ? "◉ refreshing…" : "↻ refresh"}
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-4">
            Your session
          </div>
          {connected ? (
            <dl className="space-y-3 text-sm font-mono">
              <KVRow k="address" value={address ?? ""} />
              <KVRow k="network" value={sessionNetwork?.network ?? ""} />
              <KVRow k="passphrase" value={sessionNetwork?.networkPassphrase ?? ""} />
            </dl>
          ) : (
            <div className="text-sm text-muted">
              No wallet connected. Click <b className="text-text">Connect Wallet</b>{" "}
              above to link Freighter.
            </div>
          )}
        </Card>

        <Card>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-readable mb-4">
            Orizon deploy ({info?.network ?? "…"})
          </div>
          {error && (
            <ErrorNote className="border-0 bg-transparent p-0 text-sm mb-3">
              backend offline — {error}
            </ErrorNote>
          )}
          {info ? (
            <dl className="space-y-3 text-sm font-mono">
              <KVRow k="rpc" value={info.rpc_url} />
              <KVRow k="admin" value={info.admin} />
              <KVRow k="asset" value={`${info.asset} (${info.asset_sac.slice(0, 8)}…)`} />
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
                  href={stellarExpertUrl("contract", id, info.network)}
                  target="_blank"
                  rel="noreferrer"
                  className={`clip-cyber-sm border border-border bg-bg/40 p-4 hover:border-violet/60 hover:bg-violet/5 transition ${focusRing}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{prettyName(name)}</span>
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
