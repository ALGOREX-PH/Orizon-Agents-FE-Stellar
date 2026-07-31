"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/error-note";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { getPdaxBalances, getPdaxEnvironment, getPdaxHealth } from "@/lib/pdax";
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
    retrying: envRetrying,
    reload: reloadEnv,
  } = useFetch(getPdaxEnvironment, []);
  const {
    data: health,
    error: healthError,
    loading: healthLoading,
    retrying: healthRetrying,
    reload: reloadHealth,
  } = useFetch(getPdaxHealth, []);
  const healthDown = healthError !== null;

  // Balances auto-load on mount; `reload` backs the manual refresh button.
  // While a refresh is in flight the previous rows stay visible.
  const {
    data: balances,
    error: balError,
    loading: loadingBal,
    retrying: balRetrying,
    reload: reloadBalances,
  } = useFetch(async () => (await getPdaxBalances()).balances, []);

  // An attempt is running, or `useFetch` has one scheduled on its backoff.
  // Both halves matter: without `loading` a manual retry looks inert, without
  // `retrying` the 2s/4s/8s gaps between automatic attempts do.
  const envBusy = envRetrying || envLoading;
  const healthBusy = healthRetrying || healthLoading;
  const balBusy = balRetrying || loadingBal;

  // A first read that has not come back yet — the only state the balance
  // skeletons are honest in. Once a read has failed the panel says so and
  // keeps saying so, including through every automatic retry attempt.
  const balancesPending = balances === null && balError === null && loadingBal;

  // Every failed fetch on this page reports its own message. A single
  // precedence-ordered banner used to swallow the others, and the health
  // failure was never shown at all — it only flipped a badge, so a backend
  // returning 404 read as a vague "unreachable" with no reason attached.
  // Each banner retries only the call that failed — these three fetches are
  // independent, so a one-off failure should not force a full page reload.
  const failures: {
    label: string;
    message: string;
    retry: () => void;
    retrying: boolean;
  }[] = [];
  if (envError !== null)
    failures.push({
      label: "environment",
      message: envError,
      retry: reloadEnv,
      retrying: envBusy,
    });
  if (healthError !== null)
    failures.push({
      label: "health",
      message: healthError,
      retry: reloadHealth,
      retrying: healthBusy,
    });
  if (balError !== null)
    failures.push({
      label: "balances",
      message: balError,
      retry: reloadBalances,
      retrying: balBusy,
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">PDAX Ramp</h1>
        <p className="mt-1 text-sm text-muted">
          PHP ↔ crypto on/off-ramp. USDC settles on Stellar as USDCXLM.
        </p>
      </div>

      {failures.map((f) => (
        <ErrorNote
          key={f.label}
          className="bg-magenta/10"
          onRetry={f.retry}
          retrying={f.retrying}
        >
          {f.label} — {f.message}
        </ErrorNote>
      ))}

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
            {/* "loading…" only for a read that has not failed yet: an
                automatic retry would otherwise flip this badge back from
                "unavailable" to "loading…" once per attempt. */}
            {env ? (
              <Badge tone={env.configured ? "success" : "muted"}>
                {env.environment}
              </Badge>
            ) : envLoading && envError === null ? (
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
            disabled={balBusy}
          >
            {balBusy ? "◉ loading…" : "refresh"}
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {/* Skeletons stand in for balance rows, so they are only right while
              the read is genuinely still on its way: nothing loaded and
              nothing failed. `useFetch` retries transient failures itself and
              flips `loadingBal` back to true for each attempt, so keying the
              placeholders off `loadingBal` alone would alternate shimmer and
              failure copy for the whole recovery — on the panel that carries
              the account's money. */}
          {balancesPending && (
            <>
              <LoadingStatus label="Loading balances…" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </>
          )}
          {balances === null && !balancesPending && (
            <div className="text-xs text-muted">
              Balances unavailable —{" "}
              {balBusy ? "reconnecting…" : "refresh to retry."}
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
