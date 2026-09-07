"use client";

import { useState } from "react";
import { ApiError, agentIdAvailable, buildRegisterAgent } from "@/lib/api";
import {
  normalizeSkills,
  usdcToStroops,
  validateAgentId,
  validateName,
  validatePriceUsdc,
  validateSkills,
} from "@/lib/register-validation";
import { useAsyncAction } from "@/lib/use-async-action";
import { useWallet } from "@/lib/wallet";
import { focusRing } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConnectWallet } from "@/components/ui/connect-wallet";
import { ErrorNote } from "@/components/ui/error-note";
import { SkillsInput } from "@/components/ui/skills-input";
import { NETWORK_LABEL } from "@/components/ui/stellar-link";

// The build endpoint speaks stable error codes (story 1.03). Map the ones a
// full form can hit to friendly copy; a code we don't recognise stays generic.
const FORM_LEVEL_ERRORS: Record<string, string> = {
  owner_account_unfunded: "Fund this wallet on testnet before registering.",
  id_taken: "That agent ID was just taken — pick another.",
  id_reserved: "That agent ID is reserved for the seeded catalog.",
  build_failed: "Could not build the transaction. Please try again.",
};

const inputCls = `mt-1.5 w-full bg-bg/60 border border-input p-3 font-mono text-sm placeholder:text-muted focus:border-violet transition disabled:opacity-50 ${focusRing}`;
const labelCls = "font-mono text-[10px] uppercase tracking-[0.22em] text-muted";

export default function RegisterPage() {
  const wallet = useWallet();
  const owner = wallet.address ?? "";

  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [priceStr, setPriceStr] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const touch = (field: string) =>
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));

  // Synchronous field validity — the async id-availability gate is added in a
  // follow-up. Errors only surface once a field has been touched.
  const idError = validateAgentId(agentId);
  const nameError = validateName(name);
  const skillsError = validateSkills(skills);
  const priceError = validatePriceUsdc(priceStr);

  const priceNum = Number(priceStr);
  const stroops =
    priceStr.trim() !== "" && !priceError ? usdcToStroops(priceNum) : null;

  const build = useAsyncAction(async () => {
    const xdrResp = await buildRegisterAgent({
      owner,
      agent_id: agentId,
      name: name.trim(),
      skills: normalizeSkills(skills),
      price_usdc: priceNum,
    });
    return xdrResp;
  });

  // On-chain id availability, checked on blur once the id is locally valid.
  // useAsyncAction is race- and unmount-safe, so a slow check for an old id
  // can never overwrite a newer one. The result is reset on every keystroke,
  // so stale availability never leaks past an edit.
  const idCheck = useAsyncAction(agentIdAvailable);
  const idAvailable = idCheck.data?.available === true;
  const idUnavailableMsg =
    idCheck.data && !idCheck.data.available
      ? ((idCheck.data.reason === "id_taken"
          ? "Already registered — pick another id."
          : idCheck.data.message) ?? "That id is not available.")
      : null;

  function runIdCheck() {
    touch("agent_id");
    if (!validateAgentId(agentId)) idCheck.run(agentId);
  }

  const syncValid =
    !idError && !nameError && !skillsError && !priceError && owner !== "";
  // The button stays disabled until the id check has returned available —
  // never let an operator sign against an unverified id (story 1.04 rule).
  const canSubmit =
    syncValid && idAvailable && wallet.connected && !build.pending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      agent_id: true,
      name: true,
      skills: true,
      price_usdc: true,
    });
    setFormError(null);
    if (!canSubmit) return;
    try {
      await build.run();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      setFormError(
        (code && FORM_LEVEL_ERRORS[code]) ??
          "Could not prepare the registration. Please try again.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Register an Agent
          </h1>
          <p className="mt-1 text-sm text-muted">
            List your agent on Orizon — permissionless, no signup, on Stellar{" "}
            {NETWORK_LABEL}. Your connected wallet is the owner.
          </p>
        </div>
        <ConnectWallet size="md" />
      </div>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">
            ▸ agent details
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            owner ·{" "}
            {wallet.connected ? (
              <span className="text-text break-all" title={owner}>
                {owner.slice(0, 6)}…{owner.slice(-6)}
              </span>
            ) : (
              <span className="text-magenta">connect a wallet</span>
            )}
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="reg-agent-id" className={labelCls}>
              agent id
            </label>
            <input
              id="reg-agent-id"
              value={agentId}
              onChange={(e) => {
                setAgentId(e.target.value);
                idCheck.reset();
              }}
              onBlur={runIdCheck}
              placeholder="weather_bot"
              spellCheck={false}
              autoComplete="off"
              disabled={build.pending}
              aria-invalid={Boolean(
                (touched.agent_id && idError) || idUnavailableMsg,
              )}
              aria-describedby={
                (touched.agent_id && idError) || idUnavailableMsg
                  ? "reg-agent-id-err"
                  : undefined
              }
              className={inputCls}
            />
            {touched.agent_id && idError ? (
              <ErrorNote
                id="reg-agent-id-err"
                className="border-0 bg-transparent p-0 mt-1 text-[11px]"
              >
                ⚠ {idError}
              </ErrorNote>
            ) : idCheck.pending ? (
              <div className="mt-1 font-mono text-[11px] text-muted">
                ◉ checking availability…
              </div>
            ) : idUnavailableMsg ? (
              <ErrorNote
                id="reg-agent-id-err"
                className="border-0 bg-transparent p-0 mt-1 text-[11px]"
              >
                ⚠ {idUnavailableMsg}
              </ErrorNote>
            ) : idAvailable ? (
              <div className="mt-1 font-mono text-[11px] text-cyan">
                ✓ available
              </div>
            ) : (
              <div className="mt-1 font-mono text-[11px] text-muted">
                letters, digits and underscore · 1–32 chars
              </div>
            )}
          </div>

          <div>
            <label htmlFor="reg-name" className={labelCls}>
              display name
            </label>
            <input
              id="reg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => touch("name")}
              placeholder="Weather Bot"
              disabled={build.pending}
              aria-invalid={Boolean(touched.name && nameError)}
              aria-describedby={
                touched.name && nameError ? "reg-name-err" : undefined
              }
              className={inputCls}
            />
            {touched.name && nameError ? (
              <ErrorNote
                id="reg-name-err"
                className="border-0 bg-transparent p-0 mt-1 text-[11px]"
              >
                ⚠ {nameError}
              </ErrorNote>
            ) : null}
          </div>

          <div>
            <label htmlFor="reg-skills" className={labelCls}>
              skills
            </label>
            <div className="mt-1.5">
              <SkillsInput
                id="reg-skills"
                value={skills}
                onChange={setSkills}
                disabled={build.pending}
                aria-invalid={Boolean(touched.skills && skillsError)}
                aria-describedby={
                  touched.skills && skillsError ? "reg-skills-err" : undefined
                }
              />
            </div>
            {touched.skills && skillsError ? (
              <ErrorNote
                id="reg-skills-err"
                className="border-0 bg-transparent p-0 mt-1 text-[11px]"
              >
                ⚠ {skillsError}
              </ErrorNote>
            ) : (
              <div className="mt-1 font-mono text-[11px] text-muted">
                up to 16 · Enter or comma to add
              </div>
            )}
          </div>

          <div>
            <label htmlFor="reg-price" className={labelCls}>
              price per step (USDC)
            </label>
            <input
              id="reg-price"
              inputMode="decimal"
              value={priceStr}
              onChange={(e) =>
                setPriceStr(e.target.value.replace(/[^0-9.]/g, ""))
              }
              onBlur={() => touch("price_usdc")}
              placeholder="0.054"
              disabled={build.pending}
              aria-invalid={Boolean(touched.price_usdc && priceError)}
              aria-describedby={
                touched.price_usdc && priceError ? "reg-price-err" : undefined
              }
              className={inputCls}
            />
            {touched.price_usdc && priceError ? (
              <ErrorNote
                id="reg-price-err"
                className="border-0 bg-transparent p-0 mt-1 text-[11px]"
              >
                ⚠ {priceError}
              </ErrorNote>
            ) : (
              <div className="mt-1 font-mono text-[11px] text-muted">
                {stroops !== null
                  ? `= ${stroops.toLocaleString()} stroops on-chain`
                  : "entered in USDC, converted once at submit"}
              </div>
            )}
          </div>

          {formError ? <ErrorNote>{formError}</ErrorNote> : null}
          {build.data ? (
            <div className="font-mono text-[11px] text-cyan">
              ✓ transaction prepared — wallet signing arrives in the next step.
            </div>
          ) : null}

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              variant="cyan"
              size="md"
              disabled={!canSubmit}
            >
              {build.pending ? "◉ Building…" : "Register agent ▸"}
            </Button>
            {!wallet.connected ? (
              <span className="font-mono text-[11px] text-muted">
                connect a wallet to register
              </span>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
