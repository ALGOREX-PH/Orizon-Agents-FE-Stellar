"use client";
import { DesignPrinciples } from "@/components/reputation/design-principles";
import { OnchainDetails } from "@/components/reputation/onchain-details";
import { PipelineDiagram } from "@/components/reputation/pipeline-diagram";
import { RatingRubric } from "@/components/reputation/rating-rubric";
import { RepLeaderboard } from "@/components/reputation/rep-leaderboard";
import { RepStats } from "@/components/reputation/rep-stats";
import { ScoreCalculator } from "@/components/reputation/score-calculator";
import { getReputationParams, listAgents, listReputation } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";

/**
 * /app/reputation — the reputation system end to end: live scores for every
 * registered agent, the interactive math, and the on-chain ledger behind it.
 * Every live read degrades gracefully (seeded priors, backend defaults), so
 * the page renders fully even with the chain or backend unreachable.
 */
export default function ReputationPage() {
  const {
    data: agents,
    error: agentsError,
    loading: agentsLoading,
    reload: reloadAgents,
  } = useFetch(listAgents, [], { revalidateOnFocus: true });
  const {
    data: batch,
    error: batchError,
    loading: batchLoading,
    reload: reloadBatch,
  } = useFetch(listReputation, [], { revalidateOnFocus: true });
  // Static config. The calculator and ledger card fall back to built-in
  // defaults, but the failure is surfaced rather than swallowed — a default
  // floor rendered as if it were live is a routing claim we cannot back up.
  const {
    data: params,
    error: paramsError,
    loading: paramsLoading,
    reload: reloadParams,
  } = useFetch(getReputationParams, [], {
    revalidateOnFocus: true,
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Reputation</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Decayed, value-weighted rating evidence on the ReputationLedger —
          smoothed with a Bayesian prior, bounded by a Wilson interval, and
          applied as a routing floor every time the orchestrator hires.
        </p>
      </div>

      <RepStats
        batch={batch}
        loading={batchLoading}
        error={batchError}
        onRetry={reloadBatch}
      />

      <section aria-labelledby="rep-leaderboard-heading" className="space-y-4">
        <div>
          <h2
            id="rep-leaderboard-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Leaderboard
          </h2>
          <p className="mt-1 text-sm text-muted">
            Every registered agent, ranked by its smoothed score. Agents without
            settled on-chain evidence show the ≈ prior.
          </p>
        </div>
        <RepLeaderboard
          agents={agents}
          batch={batch}
          loading={agentsLoading || batchLoading}
          agentsError={agentsError}
          batchError={batchError}
          onRetryAgents={reloadAgents}
          onRetryBatch={reloadBatch}
        />
      </section>

      <PipelineDiagram />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <RatingRubric />
        <ScoreCalculator
          params={params}
          loading={paramsLoading}
          error={paramsError}
          onRetry={reloadParams}
        />
      </div>

      <OnchainDetails params={params} />

      <section aria-labelledby="rep-principles-heading" className="space-y-4">
        <div>
          <h2
            id="rep-principles-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Design principles
          </h2>
          <p className="mt-1 text-sm text-muted">
            Why the score is hard to game — and safe to route on.
          </p>
        </div>
        <DesignPrinciples />
      </section>
    </div>
  );
}
