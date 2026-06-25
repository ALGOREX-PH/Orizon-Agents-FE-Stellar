"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPdaxCryptoTransactions } from "@/lib/pdax";
import type { PdaxCryptoTransaction } from "@/lib/pdax-types";

function tone(status: string): "success" | "magenta" | "muted" {
  const s = status.toLowerCase();
  if (s === "completed") return "success";
  if (s === "failed") return "magenta";
  return "muted";
}

/** Recent crypto deposits / withdrawals on the PDAX account. */
export function TransactionsPanel() {
  const [txns, setTxns] = useState<PdaxCryptoTransaction[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { transactions } = await getPdaxCryptoTransactions({ pageSize: 10 });
      setTxns(transactions);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          crypto transactions
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={busy}>
          {busy ? "◉ loading…" : "load"}
        </Button>
      </div>

      {err && <div className="mt-3 text-xs font-mono text-magenta">{err}</div>}

      <div className="mt-4 space-y-2">
        {txns === null && (
          <div className="text-xs text-muted">No transactions loaded yet.</div>
        )}
        {txns?.length === 0 && <div className="text-xs text-muted">No records.</div>}
        {txns?.map((t) => (
          <div
            key={t.transaction_id}
            className="flex items-center justify-between border border-border bg-bg/40 px-3 py-2"
          >
            <div className="font-mono text-xs">
              <div>
                {t.type} · {t.credit_ccy ?? t.debit_ccy ?? ""}
              </div>
              {t.txn_hash && (
                <div className="text-[10px] text-muted break-all">{t.txn_hash}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">
                {t.credit_amount !== "0" ? `+${t.credit_amount}` : `-${t.debit_amount}`}
              </span>
              <Badge tone={tone(t.status)}>{t.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
