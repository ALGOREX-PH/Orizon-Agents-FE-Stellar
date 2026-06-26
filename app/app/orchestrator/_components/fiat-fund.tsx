"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { pdaxFundingQuote, pdaxReconcileRamp, pdaxStartOnRamp } from "@/lib/pdax";
import type { PdaxFundingQuote, PdaxRampRecord } from "@/lib/pdax-types";

const inputCls =
  "w-full bg-bg/60 border border-border px-3 py-2 text-sm font-mono outline-none focus:border-violet";

const METHODS = [
  ["instapay_upay_cashin", "Bank / e-wallet (QRPh)"],
  ["paymaya_pay", "Maya"],
  ["grabpay_cashin", "GrabPay"],
  ["ub_online_upay_cashin", "UnionBank online"],
];

/** Pay for a workflow in PHP: price the USDC total in pesos, then on-ramp via
 * PDAX (bank/e-wallet) with USDCXLM delivered to the buyer's Stellar address. */
export function FiatFund({
  usdcAmount,
  stellarAddress,
}: {
  usdcAmount: number;
  stellarAddress?: string;
}) {
  const [php, setPhp] = useState("");
  const [quote, setQuote] = useState<PdaxFundingQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [address, setAddress] = useState(stellarAddress ?? "");
  const [method, setMethod] = useState(METHODS[0][0]);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [record, setRecord] = useState<PdaxRampRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Server-authoritative funding quote: pesos that always cover the workflow
  // (buffer + round-up applied backend-side).
  useEffect(() => {
    if (!usdcAmount) return;
    setQuoting(true);
    setErr(null);
    pdaxFundingQuote(String(usdcAmount))
      .then((q) => {
        setQuote(q);
        setPhp(String(q.php_to_pay));
      })
      .catch((e) => setErr(`couldn't price in PHP — ${String(e)}`))
      .finally(() => setQuoting(false));
  }, [usdcAmount]);

  useEffect(() => {
    if (stellarAddress) setAddress(stellarAddress);
  }, [stellarAddress]);

  // Once a ramp is started, poll our backend (which reconciles against PDAX)
  // so status updates here — no dependence on PDAX's redirect page.
  useEffect(() => {
    if (!record || record.status === "completed" || record.status === "failed") {
      return;
    }
    const id = setInterval(() => {
      pdaxReconcileRamp(record.ramp_id).then(setRecord).catch(() => {});
    }, 6000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.ramp_id, record?.status]);

  const fund = async () => {
    setErr(null);
    setBusy(true);
    setRecord(null);
    try {
      const r = await pdaxStartOnRamp({
        php_amount: php,
        stellar_address: address,
        method,
        identifier: crypto.randomUUID(),
        sender_first_name: first,
        sender_last_name: last,
        beneficiary_first_name: first,
        beneficiary_last_name: last,
      });
      setRecord(r);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="clip-cyber-sm border border-violet/40 bg-violet/5 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet mb-1">
        ▸ pay with PHP (no crypto needed)
      </div>
      <p className="text-sm mb-3">
        Fund this workflow with pesos via bank / e-wallet. PDAX converts to{" "}
        <b className="text-text">USDCXLM</b> and delivers it to your Stellar
        address, then you authorize as usual.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[10px] text-muted">amount (PHP) · auto</span>
          <input
            value={quoting ? "" : php ? `₱${php}` : ""}
            readOnly
            tabIndex={-1}
            aria-label="amount in PHP, computed automatically"
            className={`${inputCls} cursor-default text-violet`}
            placeholder={quoting ? "computing…" : "—"}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted">pay via</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
            {METHODS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {quote && (
        <div className="mt-2 text-[11px] font-mono text-muted">
          funds <b className="text-text">{quote.usdc_target} USDC</b> · base ≈ ₱
          {quote.php_base.toFixed(2)} + {(quote.buffer_bps / 100).toFixed(1)}% buffer →{" "}
          <b className="text-violet">you pay ₱{quote.php_to_pay}</b>
          {quote.php_to_pay >
            quote.php_base * (1 + quote.buffer_bps / 10000) + 0.5 && (
            <span className="text-cyan">
              {" "}
              · PDAX minimum — extra stays as USDC in your wallet
            </span>
          )}
        </div>
      )}

      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className={`${inputCls} mt-2`}
        placeholder="Stellar address (G…) to receive USDCXLM"
      />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <input value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} placeholder="first name" />
        <input value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} placeholder="last name" />
      </div>

      <Button
        variant="primary"
        onClick={fund}
        disabled={busy || quoting || !php || !address}
        size="md"
        className="mt-3 w-full"
      >
        {busy
          ? "◉ starting…"
          : quoting
            ? "◉ computing amount…"
            : `Pay ₱${php} with PHP ▸`}
      </Button>

      {err && <div className="mt-2 text-xs font-mono text-magenta">{err}</div>}

      {record && (
        <div className="mt-3 border border-border bg-bg/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted">{record.ramp_id}</span>
            <Badge tone={record.status === "failed" ? "magenta" : "cyan"}>{record.status}</Badge>
          </div>
          {record.checkout_url && (
            <a href={record.checkout_url} target="_blank" rel="noreferrer" className="block font-mono text-xs text-cyan underline break-all">
              ▸ pay here: {record.checkout_url}
            </a>
          )}
          {record.status !== "completed" && record.status !== "failed" && (
            <div className="text-[10px] font-mono text-muted">
              ◉ tracking here — after you pay, this completes automatically.
              You can ignore PDAX&apos;s redirect page.
            </div>
          )}
          {record.stages.length > 0 && (
            <div className="space-y-1 pt-1">
              {record.stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
                  <span
                    className={
                      s.status === "success"
                        ? "text-cyan"
                        : s.status === "failed"
                          ? "text-magenta"
                          : "text-muted"
                    }
                  >
                    {s.status === "success" ? "✓" : s.status === "failed" ? "✕" : "•"}
                  </span>
                  <span className="text-muted">{s.name}</span>
                  {s.detail && <span className="text-muted/70">— {s.detail}</span>}
                </div>
              ))}
            </div>
          )}
          {record.error && <div className="text-[11px] font-mono text-magenta">{record.error}</div>}
        </div>
      )}
    </div>
  );
}
