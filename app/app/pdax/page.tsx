"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPdaxBalances,
  getPdaxEnvironment,
  getPdaxHealth,
} from "@/lib/pdax";
import type { PdaxBalance, PdaxEnvironment, PdaxHealth } from "@/lib/pdax-types";
import { RampPanel } from "./_components/ramp-panel";
import { PricePanel } from "./_components/price-panel";
import { DepositPanel } from "./_components/deposit-panel";
import { TransactionsPanel } from "./_components/transactions-panel";

export default function PdaxPage() {
  const [env, setEnv] = useState<PdaxEnvironment | null>(null);
  const [health, setHealth] = useState<PdaxHealth | null>(null);
  const [balances, setBalances] = useState<PdaxBalance[] | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getPdaxEnvironment().then(setEnv).catch((e) => setErr(String(e)));
  }, []);

  const loadBalances = async () => {
    setErr(null);
    setLoadingBal(true);
    try {
      const { balances } = await getPdaxBalances();
      setBalances(balances);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoadingBal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">PDAX Ramp</h1>
        <p className="mt-1 text-sm text-muted">
          PHP ↔ crypto on/off-ramp. USDC settles on Stellar as USDCXLM.
        </p>
      </div>

      {err && (
        <div className="border border-magenta/40 bg-magenta/10 px-4 py-3 text-xs font-mono text-magenta">
          {err}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
            environment
          </div>
          {env ? (
            <Badge tone={env.configured ? "success" : "muted"} dot>
              {env.environment}
            </Badge>
          ) : (
            <Badge tone="muted">loading…</Badge>
          )}
        </div>
        {env && (
          <div className="mt-3 font-mono text-[11px] text-muted break-all">
            {env.base_url}
            {!env.configured && (
              <span className="ml-2 text-magenta">
                — credentials not configured
              </span>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
            balances
          </div>
          <Button size="sm" variant="outline" onClick={loadBalances} disabled={loadingBal}>
            {loadingBal ? "◉ loading…" : "refresh"}
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {balances === null && (
            <div className="text-xs text-muted">No balances loaded yet.</div>
          )}
          {balances?.length === 0 && (
            <div className="text-xs text-muted">No assets.</div>
          )}
          {balances?.map((b) => (
            <div
              key={b.currency}
              className="flex items-center justify-between border border-border bg-bg/40 px-3 py-2"
            >
              <span className="font-mono text-sm">{b.currency}</span>
              <span className="font-mono text-sm">
                {b.available}{" "}
                <span className="text-[10px] text-muted">avail</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <RampPanel />

      <div className="grid gap-6 lg:grid-cols-2">
        <PricePanel />
        <DepositPanel />
      </div>

      <TransactionsPanel />
    </div>
  );
}
