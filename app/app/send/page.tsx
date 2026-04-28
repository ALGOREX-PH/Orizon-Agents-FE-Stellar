"use client";
import { useMemo, useState } from "react";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectWallet } from "@/components/ui/connect-wallet";
import { useWallet } from "@/lib/wallet";

const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";

type SuccessState = {
  hash: string;
  destination: string;
  amount: string;
  memo: string | null;
};

type ErrorState = {
  message: string;
  code?: string;
  resultCodes?: { transaction?: string; operations?: string[] };
};

function isValidGAddress(s: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(s.trim());
}

function trimMemo(m: string): string {
  // Memo.text is up to 28 bytes UTF-8.
  let s = m;
  while (new TextEncoder().encode(s).length > 28) {
    s = s.slice(0, -1);
  }
  return s;
}

function shortG(g: string): string {
  return `${g.slice(0, 6)}…${g.slice(-6)}`;
}

export default function SendPage() {
  const wallet = useWallet();

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"" | "build" | "sign" | "submit">("");
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [err, setErr] = useState<ErrorState | null>(null);

  const balanceNum = wallet.xlmBalance ? parseFloat(wallet.xlmBalance) : null;
  const amountNum = amount ? parseFloat(amount) : NaN;

  const validation = useMemo(() => {
    if (!destination) return "destination required";
    if (!isValidGAddress(destination)) return "destination must be a 56-char G… address";
    if (wallet.address && destination.trim() === wallet.address) {
      return "destination cannot be your own address";
    }
    if (!amount) return "amount required";
    if (!Number.isFinite(amountNum) || amountNum <= 0) return "amount must be > 0";
    if (balanceNum !== null && amountNum > balanceNum - 0.0001) {
      return `amount exceeds balance (${balanceNum.toFixed(4)} XLM available)`;
    }
    return null;
  }, [destination, amount, amountNum, balanceNum, wallet.address]);

  const send = async () => {
    if (!wallet.connected || !wallet.address) return;
    if (validation) return;

    setSubmitting(true);
    setErr(null);
    setSuccess(null);

    try {
      setStep("build");
      const server = new Horizon.Server(HORIZON_TESTNET);
      const account = await server.loadAccount(wallet.address);

      const memoTrimmed = memo.trim() ? trimMemo(memo.trim()) : "";
      const builder = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: destination.trim(),
            asset: Asset.native(),
            amount: amountNum.toFixed(7),
          }),
        )
        .setTimeout(60);

      const tx = (memoTrimmed ? builder.addMemo(Memo.text(memoTrimmed)) : builder).build();

      setStep("sign");
      const signedXdr = await wallet.signXdr(tx.toXDR(), {
        networkPassphrase: Networks.TESTNET,
      });

      setStep("submit");
      const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      const result = await server.submitTransaction(signedTx);

      setSuccess({
        hash: result.hash,
        destination: destination.trim(),
        amount: amountNum.toFixed(7),
        memo: memoTrimmed || null,
      });
      setDestination("");
      setAmount("");
      setMemo("");
      // Refresh balance to reflect the spend.
      wallet.refreshBalance();
    } catch (e: unknown) {
      const ex = e as {
        message?: string;
        response?: {
          data?: {
            extras?: {
              result_codes?: { transaction?: string; operations?: string[] };
            };
          };
        };
      };
      const codes = ex?.response?.data?.extras?.result_codes;
      setErr({
        message: ex?.message || "transaction failed",
        code: codes?.transaction,
        resultCodes: codes,
      });
    } finally {
      setSubmitting(false);
      setStep("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Send XLM</h1>
          <p className="mt-1 text-sm text-muted">
            Plain Stellar payment — sign with Freighter, broadcast through Horizon
            testnet.
          </p>
        </div>
        <ConnectWallet size="md" />
      </div>

      {!wallet.connected && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta mb-1">
                ▸ wallet required
              </div>
              <div className="text-sm">
                Connect Freighter on <b className="text-text">Test Net</b> to send a
                payment.
              </div>
            </div>
            <ConnectWallet size="md" />
          </div>
        </Card>
      )}

      {wallet.connected && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">
              ▸ payment
            </div>
            <Badge tone="cyan" dot>
              testnet
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                destination
              </label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="G… 56 chars"
                spellCheck={false}
                autoComplete="off"
                className="mt-1.5 w-full bg-bg/60 border border-border p-3 font-mono text-sm placeholder:text-muted/70 focus:border-violet focus:outline-none focus:shadow-neon-violet transition"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr,1fr]">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                  amount (XLM)
                </label>
                <input
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="1.0000000"
                  inputMode="decimal"
                  className="mt-1.5 w-full bg-bg/60 border border-border p-3 font-mono text-sm placeholder:text-muted/70 focus:border-violet focus:outline-none focus:shadow-neon-violet transition"
                />
                <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted">
                  <span>
                    available:{" "}
                    <span className="text-cyan">
                      {balanceNum === null ? "—" : balanceNum.toFixed(4)} XLM
                    </span>
                  </span>
                  {balanceNum !== null && balanceNum > 1 && (
                    <button
                      onClick={() => setAmount("1")}
                      className="hover:text-text transition"
                    >
                      ▸ 1 XLM
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                  memo (optional · ≤28 bytes)
                </label>
                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="White Belt"
                  maxLength={28}
                  className="mt-1.5 w-full bg-bg/60 border border-border p-3 font-mono text-sm placeholder:text-muted/70 focus:border-violet focus:outline-none focus:shadow-neon-violet transition"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
            <div className="font-mono text-[11px] text-muted">
              {validation ? (
                <span className="text-magenta">⚠ {validation}</span>
              ) : (
                <span>ready · base fee {BASE_FEE} stroops · timeout 60s</span>
              )}
            </div>
            <Button
              variant="cyan"
              size="md"
              onClick={send}
              disabled={Boolean(validation) || submitting}
            >
              {submitting
                ? step === "build"
                  ? "◉ Building…"
                  : step === "sign"
                    ? "◉ Freighter…"
                    : "◉ Submitting…"
                : "Send XLM ▸"}
            </Button>
          </div>
        </Card>
      )}

      {success && (
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-3">
            ✓ transaction successful
          </div>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <span className="text-muted text-[10px] uppercase tracking-widest">
                sent
              </span>
              <span className="text-text">
                {success.amount} XLM → {shortG(success.destination)}
              </span>
            </div>
            {success.memo && (
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <span className="text-muted text-[10px] uppercase tracking-widest">
                  memo
                </span>
                <span className="text-text">{success.memo}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <span className="text-muted text-[10px] uppercase tracking-widest">
                tx hash
              </span>
              <span className="text-cyan break-all text-right">{success.hash}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${success.hash}`}
              target="_blank"
              rel="noreferrer"
              className="clip-cyber-sm border border-cyan/60 bg-cyan/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-cyan hover:bg-cyan/20 transition"
            >
              view on stellar.expert ▸
            </a>
            <a
              href={`${HORIZON_TESTNET}/transactions/${success.hash}`}
              target="_blank"
              rel="noreferrer"
              className="clip-cyber-sm border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-text hover:border-violet/60 transition"
            >
              raw horizon ▸
            </a>
          </div>
        </Card>
      )}

      {err && (
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta mb-3">
            ✗ transaction failed
          </div>
          <div className="font-mono text-sm text-magenta break-all">
            {err.message}
          </div>
          {err.code && (
            <div className="mt-3 font-mono text-xs text-muted">
              transaction: <span className="text-text">{err.code}</span>
            </div>
          )}
          {err.resultCodes?.operations && err.resultCodes.operations.length > 0 && (
            <div className="mt-1 font-mono text-xs text-muted">
              operations:{" "}
              <span className="text-text">
                {err.resultCodes.operations.join(", ")}
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
