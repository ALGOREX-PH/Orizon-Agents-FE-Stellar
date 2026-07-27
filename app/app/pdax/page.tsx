"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import {
  getPdaxBalances,
  getPdaxEnvironment,
  getPdaxHealth,
} from "@/lib/pdax";
import { useFetch } from "@/lib/use-fetch";
import { RampPanel } from "./_components/ramp-panel";
import { PricePanel } from "./_components/price-panel";
import { DepositPanel } from "./_components/deposit-panel";
import { TransactionsPanel } from "./_components/transactions-panel";

export default function PdaxPage() {
  const {
    data: env,
    error: envError,
    loading: envLoading,
  } = useFetch(getPdaxEnvironment, []);
  const { data: health, error: healthError } = useFetch(getPdaxHealth, []);
  const healthDown = healthError !== null;

  // Balances auto-load on mount; `reload` backs the manual refresh button.
  // While a refresh is in flight the previous rows stay visible.
  const {
    data: balances,
    error: balError,
    loading: loadingBal,
    reload: reloadBalances,
  } = useFetch(async () => (await getPdaxBalances()).balances, []);

  // Shared banner: the balances failure takes precedence; an environment
  // fetch failure also surfaces here.
  const err = balError ?? envError;

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
          <div className="flex items-center gap-2">
            {health && (
              <Badge
                tone={
                  health.status === "ok"
                    ? "success"
                    : health.status === "degraded"
                      ? "magenta"
                      : "muted"
                }
                dot
              >
                {health.status}
              </Badge>
            )}
            {healthDown && !health && (
              <Badge tone="magenta" dot>
                health unreachable
              </Badge>
            )}
            {env ? (
              <Badge tone={env.configured ? "success" : "muted"}>
                {env.environment}
              </Badge>
            ) : envLoading ? (
              <Badge tone="muted">loading…</Badge>
            ) : (
              <Badge tone="magenta">unavailable</Badge>
            )}
          </div>
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
          <Button
            size="sm"
            variant="outline"
            onClick={reloadBalances}
            disabled={loadingBal}
          >
            {loadingBal ? "◉ loading…" : "refresh"}
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {balances === null && loadingBal && (
            <>
              <LoadingStatus label="Loading balances…" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </>
          )}
          {balances === null && !loadingBal && (
            <div className="text-xs text-muted">
              Balances unavailable — refresh to retry.
            </div>
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
