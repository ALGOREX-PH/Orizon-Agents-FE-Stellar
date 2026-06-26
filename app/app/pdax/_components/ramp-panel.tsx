"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  pdaxRampEstimate,
  pdaxStartOffRamp,
  pdaxStartOnRamp,
} from "@/lib/pdax";
import type {
  PdaxRampEstimate,
  PdaxRampRecord,
  RampDirection,
} from "@/lib/pdax-types";

const inputCls =
  "w-full bg-bg/60 border border-border px-3 py-2 text-sm font-mono outline-none focus:border-violet";

const DEPOSIT_METHODS = [
  "instapay_upay_cashin",
  "paymaya_pay",
  "grabpay_cashin",
  "ub_online_upay_cashin",
];

function statusTone(s: string): "success" | "magenta" | "cyan" | "muted" {
  if (s === "completed") return "success";
  if (s === "failed") return "magenta";
  if (s === "awaiting_payment") return "cyan";
  return "muted";
}

/** PHP <-> USDCXLM ramp console: estimate + start on-ramp / off-ramp. */
export function RampPanel() {
  const [dir, setDir] = useState<RampDirection>("onramp");
  const [amount, setAmount] = useState("1000");
  const [stellar, setStellar] = useState("");
  const [method, setMethod] = useState(DEPOSIT_METHODS[0]);
  const [bankCode, setBankCode] = useState("BAUBPPH");
  const [accName, setAccName] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");

  const [est, setEst] = useState<PdaxRampEstimate | null>(null);
  const [record, setRecord] = useState<PdaxRampRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onRamp = dir === "onramp";

  const estimate = async () => {
    setErr(null);
    setBusy(true);
    try {
      setEst(await pdaxRampEstimate(dir, amount));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setErr(null);
    setBusy(true);
    setRecord(null);
    try {
      const id = crypto.randomUUID();
      const r = onRamp
        ? await pdaxStartOnRamp({
            php_amount: amount,
            stellar_address: stellar,
            method,
            identifier: id,
            sender_first_name: first,
            sender_last_name: last,
            beneficiary_first_name: first,
            beneficiary_last_name: last,
          })
        : await pdaxStartOffRamp({
            usdc_amount: amount,
            identifier: id,
            beneficiary_bank_code: bankCode,
            beneficiary_account_name: accName,
            beneficiary_account_number: accNumber,
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
    <Card glow>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          ramp · PHP ⇄ USDCXLM
        </div>
        <div className="flex gap-1">
          {(["onramp", "offramp"] as RampDirection[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDir(d);
                setEst(null);
                setRecord(null);
              }}
              className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest border ${
                dir === d
                  ? "border-violet bg-violet/15 text-violet"
                  : "border-border text-muted"
              }`}
            >
              {d === "onramp" ? "PHP→USDC" : "USDC→PHP"}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        {onRamp
          ? "Buyer pays PHP via bank/e-wallet → USDCXLM delivered to a Stellar address."
          : "Agent sends USDCXLM to a deposit address → PHP paid out to a bank account."}
      </p>

      <div className="mt-4 space-y-3">
        <label className="block space-y-1">
          <span className="text-[10px] text-muted">
            amount ({onRamp ? "PHP" : "USDC"})
          </span>
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            <Button size="sm" variant="outline" onClick={estimate} disabled={busy}>
              {busy ? "◉" : "estimate"}
            </Button>
          </div>
        </label>

        {est && (
          <div className="border border-border bg-bg/40 px-3 py-2 font-mono text-xs">
            ≈ {onRamp ? `${est.usdc_amount} USDC` : `${est.php_amount} PHP`}{" "}
            <span className="text-muted">@ {est.price} PHP/USDC</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} placeholder="first name" />
          <input value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} placeholder="last name" />
        </div>

        {onRamp ? (
          <>
            <input value={stellar} onChange={(e) => setStellar(e.target.value)} className={inputCls} placeholder="Stellar address (G…) to receive USDCXLM" />
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              {DEPOSIT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <input value={bankCode} onChange={(e) => setBankCode(e.target.value.toUpperCase())} className={inputCls} placeholder="bank code (e.g. BAUBPPH)" />
            <div className="grid grid-cols-2 gap-2">
              <input value={accName} onChange={(e) => setAccName(e.target.value)} className={inputCls} placeholder="account name" />
              <input value={accNumber} onChange={(e) => setAccNumber(e.target.value)} className={inputCls} placeholder="account number" />
            </div>
          </>
        )}

        <Button variant="cyan" onClick={start} disabled={busy} className="w-full">
          {busy ? "◉ starting…" : onRamp ? "start on-ramp ▸" : "start off-ramp ▸"}
        </Button>
      </div>

      {err && <div className="mt-3 text-xs font-mono text-magenta">{err}</div>}

      {record && (
        <div className="mt-4 border border-border bg-bg/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted">{record.ramp_id}</span>
            <Badge tone={statusTone(record.status)}>{record.status}</Badge>
          </div>
          {record.checkout_url && (
            <a href={record.checkout_url} target="_blank" rel="noreferrer" className="block font-mono text-xs text-cyan underline break-all">
              ▸ pay here: {record.checkout_url}
            </a>
          )}
          {record.deposit_address && (
            <div className="font-mono text-xs break-all">
              send USDCXLM → <span className="text-cyan">{record.deposit_address}</span>
              {record.deposit_tag && <div className="text-[10px] text-muted">memo: {record.deposit_tag}</div>}
            </div>
          )}
          <div className="space-y-1 pt-1">
            {record.stages.map((s, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
                <span className={s.status === "success" ? "text-cyan" : s.status === "failed" ? "text-magenta" : "text-muted"}>
                  {s.status === "success" ? "✓" : s.status === "failed" ? "✕" : "•"}
                </span>
                <span className="text-muted">{s.name}</span>
                {s.detail && <span className="text-muted/70">— {s.detail}</span>}
              </div>
            ))}
          </div>
          {record.error && <div className="text-[11px] font-mono text-magenta">{record.error}</div>}
        </div>
      )}
    </Card>
  );
}
