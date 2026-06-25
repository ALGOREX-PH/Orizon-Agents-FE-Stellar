"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPdaxCryptoDeposit } from "@/lib/pdax";
import type { PdaxCryptoDepositAddress } from "@/lib/pdax-types";

const inputCls =
  "w-full bg-bg/60 border border-border px-3 py-2 text-sm font-mono outline-none focus:border-violet";

/** Fetch a PDAX deposit wallet for a token (default USDCXLM — USDC on Stellar). */
export function DepositPanel() {
  const [currency, setCurrency] = useState("USDCXLM");
  const [addr, setAddr] = useState<PdaxCryptoDepositAddress | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setErr(null);
    setBusy(true);
    setAddr(null);
    try {
      setAddr(await getPdaxCryptoDeposit(currency));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!addr) return;
    await navigator.clipboard.writeText(addr.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
        crypto deposit address
      </div>

      <div className="mt-4 flex gap-3">
        <input
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
