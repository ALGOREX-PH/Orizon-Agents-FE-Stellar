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
import { TxStatus, type TxState } from "@/components/ui/tx-status";
import { useWallet } from "@/lib/wallet";
import { classifyError, type FriendlyError } from "@/lib/wallet-errors";

const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";

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

export default function SendPage() {
  const wallet = useWallet();

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<{
    amount: string;
    destination: string;
    memo: string | null;
  } | null>(null);
  const [err, setErr] = useState<FriendlyError | null>(null);

  const submitting = txState !== "idle" && txState !== "success" && txState !== "failed";

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

    setErr(null);
    setTxHash(null);
    setLastSent(null);

    try {
      setTxState("building");
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

      setTxState("signing");
      const signedXdr = await wallet.signXdr(tx.toXDR(), {
        networkPassphrase: Networks.TESTNET,
      });

      setTxState("broadcasting");
      const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      // Brief "pending" frame so users see the lifecycle stage explicitly.
      setTxState("pending");
      const result = await server.submitTransaction(signedTx);

      setTxHash(result.hash);
      setLastSent({
        amount: `${amountNum.toFixed(7)} XLM`,
        destination: destination.trim(),
        memo: memoTrimmed || null,
      });
      setTxState("success");
      setDestination("");
      setAmount("");
      setMemo("");
      wallet.refreshBalance();
    } catch (e: unknown) {
      setErr(classifyError(e));
      setTxState("failed");
    }
  };

  const reset = () => {
    setTxState("idle");
    setTxHash(null);
    setErr(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Send XLM</h1>
          <p className="mt-1 text-sm text-muted">
            Plain Stellar payment — sign with any supported wallet, broadcast through
            Horizon testnet.
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
                Connect a Stellar wallet on <b className="text-text">Test Net</b> to
                send a payment.
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
                disabled={submitting}
                className="mt-1.5 w-full bg-bg/60 border border-border p-3 font-mono text-sm placeholder:text-muted/70 focus:border-violet focus:outline-none focus:shadow-neon-violet transition disabled:opacity-50"
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
                  disabled={submitting}
                  className="mt-1.5 w-full bg-bg/60 border border-border p-3 font-mono text-sm placeholder:text-muted/70 focus:border-violet focus:outline-none focus:shadow-neon-violet transition disabled:opacity-50"
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
                  placeholder="Yellow Belt"
                  maxLength={28}
                  disabled={submitting}
                  className="mt-1.5 w-full bg-bg/60 border border-border p-3 font-mono text-sm placeholder:text-muted/70 focus:border-violet focus:outline-none focus:shadow-neon-violet transition disabled:opacity-50"
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
            <div className="flex gap-2">
              {(txState === "success" || txState === "failed") && (
                <Button variant="outline" size="md" onClick={reset}>
                  reset
                </Button>
              )}
              <Button
                variant="cyan"
                size="md"
                onClick={send}
                disabled={Boolean(validation) || submitting}
              >
                {submitting
                  ? txState === "building"
                    ? "◉ Building…"
                    : txState === "signing"
                      ? "◉ Wallet…"
                      : txState === "broadcasting"
                        ? "◉ Broadcasting…"
                        : "◉ Pending…"
                  : "Send XLM ▸"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <TxStatus
        state={txState}
        hash={txHash ?? undefined}
        amount={lastSent?.amount}
        destination={lastSent?.destination}
        memo={lastSent?.memo}
        error={err}
        network="testnet"
      />
    </div>
  );
}
