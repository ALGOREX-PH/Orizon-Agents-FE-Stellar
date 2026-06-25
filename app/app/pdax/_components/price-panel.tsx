"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPdaxPrice, pdaxFirmQuote } from "@/lib/pdax";
import type { PdaxQuote, PdaxSide } from "@/lib/pdax-types";

const inputCls =
  "w-full bg-bg/60 border border-border px-3 py-2 text-sm font-mono outline-none focus:border-violet";

/** Indicative price + firm-quote console for a PHP pair (default USDC). */
export function PricePanel() {
  const [side, setSide] = useState<PdaxSide>("buy");
  const [quoteCurrency, setQuoteCurrency] = useState("USDC");
  const [baseQuantity, setBaseQuantity] = useState("100");
  const [quote, setQuote] = useState<PdaxQuote | null>(null);
  const [firm, setFirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (firmQuote: boolean) => {
    setErr(null);
    setBusy(true);
    setQuote(null);
    try {
      const q = firmQuote
        ? await pdaxFirmQuote({ quote_currency: quoteCurrency, side, base_quantity: baseQuantity })
        : await getPdaxPrice({ quote_currency: quoteCurrency, side, base_quantity: baseQuantity });
      setQuote(q);
      setFirm(firmQuote);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
        price &amp; quote
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] text-muted">side</span>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as PdaxSide)}
            className={inputCls}
          >
            <option value="buy">buy</option>
            <option value="sell">sell</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted">asset</span>
          <input
            value={quoteCurrency}
            onChange={(e) => setQuoteCurrency(e.target.value.toUpperCase())}
            className={inputCls}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted">quantity</span>
          <input
            value={baseQuantity}
            onChange={(e) => setBaseQuantity(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-4 flex gap-3">
        <Button size="sm" variant="outline" onClick={() => run(false)} disabled={busy}>
          {busy ? "◉ …" : "indicative price"}
        </Button>
        <Button size="sm" variant="cyan" onClick={() => run(true)} disabled={busy}>
          firm quote
        </Button>
      </div>

      {err && (
        <div className="mt-3 text-xs font-mono text-magenta">{err}</div>
      )}

      {quote && (
        <div className="mt-4 border border-border bg-bg/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">
              {quote.side} {quote.base_quantity} {quote.quote_currency}
            </span>
            <Badge tone={firm ? "cyan" : "muted"}>{firm ? "firm" : "indicative"}</Badge>
          </div>
          <div className="font-mono text-xs text-muted">
            price {quote.price} {quote.base_currency} · total {quote.total_amount}{" "}
            {quote.base_currency}
          </div>
          {firm && quote.quote_id && (
            <div className="font-mono text-[10px] text-cyan break-all">
              quote_id {quote.quote_id} · expires {quote.expires_at}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
