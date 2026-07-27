"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPdaxCryptoDeposit } from "@/lib/pdax";
import { inputCls } from "@/lib/ui";
import { useAsyncAction } from "@/lib/use-async-action";

/** Fetch a PDAX deposit wallet for a token (default USDCXLM — USDC on Stellar). */
export function DepositPanel() {
  const [currency, setCurrency] = useState("USDCXLM");
  const [copied, setCopied] = useState(false);
  // Clipboard failures are a separate error source from the fetch; the
  // fetch action's error takes precedence and a new load clears both.
  const [copyErr, setCopyErr] = useState<string | null>(null);

  const {
    run: fetchAddr,
    data: addr,
    error: loadErr,
    pending: busy,
    reset,
  } = useAsyncAction(() => getPdaxCryptoDeposit(currency));

  const load = () => {
    reset(); // drop the previous address while the new one is in flight
    setCopyErr(null);
    void fetchAddr();
  };

  const err = loadErr ?? copyErr;

  const copy = async () => {
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr.address);
      setCopied(true);
    } catch {
      setCopyErr("copy failed — clipboard unavailable");
    }
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
        crypto deposit address
      </div>

      <div className="mt-4 flex gap-3">
        <input
          aria-label="Deposit currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          className={inputCls}
          placeholder="USDCXLM"
        />
        <Button size="sm" variant="outline" onClick={load} disabled={busy}>
          {busy ? "◉ …" : "get address"}
        </Button>
      </div>

      {err && <div className="mt-3 text-xs font-mono text-magenta">{err}</div>}

      {addr && (
        <div className="mt-4 border border-border bg-bg/40 p-4 space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {addr.currency}
          </div>
          <div className="font-mono text-xs break-all">{addr.address}</div>
          {addr.tag && (
            <div className="font-mono text-[11px] text-cyan">memo / tag: {addr.tag}</div>
          )}
          <Button size="sm" variant="ghost" onClick={copy}>
            {copied ? "copied ✓" : "copy address"}
          </Button>
        </div>
      )}
    </Card>
  );
}
