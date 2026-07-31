/**
 * Tests for the shallow runtime guards in lib/guards.ts.
 *
 * Each guard accepts a realistic valid payload (extra unknown keys included —
 * the guards are deliberately non-exhaustive) and rejects payloads where an
 * arithmetic-critical field carries the wrong type.
 */

import { describe, expect, it } from "vitest";
import {
  isAgentList,
  isArtifactResponse,
  isDecomposeResponse,
  isFlow,
  isOverview,
  isReputationBatch,
  isReputationParams,
  isStellarNetworkInfo,
  isTaskList,
} from "./guards";

describe("isAgentList", () => {
  const agent = {
    id: "agt_01",
    name: "copywrite.v3",
    skills: ["content", "seo"],
    price: 0.012,
    rep: 4.6,
    status: "online",
    runs: 1284,
    real: true,
  };

  it("accepts a valid list and the empty list", () => {
    expect(isAgentList([agent])).toBe(true);
    expect(isAgentList([])).toBe(true);
  });

  it("rejects a non-array payload", () => {
    expect(isAgentList({ agents: [agent] })).toBe(false);
    expect(isAgentList(null)).toBe(false);
  });

  it("rejects a non-numeric price (feeds .toFixed)", () => {
    expect(isAgentList([{ ...agent, price: "0.012" }])).toBe(false);
  });

  it("rejects a missing runs count (feeds .toLocaleString)", () => {
    const { runs: _drop, ...rest } = agent;
    expect(isAgentList([rest])).toBe(false);
  });

  it("rejects a non-numeric rep (feeds rep * 2000)", () => {
    expect(isAgentList([{ ...agent, rep: null }])).toBe(false);
  });

  it("rejects skills that are not an array of strings (feeds .map)", () => {
    expect(isAgentList([{ ...agent, skills: "content" }])).toBe(false);
    expect(isAgentList([{ ...agent, skills: [{ name: "content" }] }])).toBe(
      false,
    );
  });

  it("rejects a status outside the backend literal (keys the tone map)", () => {
    expect(isAgentList([{ ...agent, status: "degraded" }])).toBe(false);
    expect(isAgentList([{ ...agent, status: undefined }])).toBe(false);
  });

  it("rejects when any single entry is malformed", () => {
    expect(isAgentList([agent, { ...agent, price: undefined }])).toBe(false);
  });
});

describe("isOverview", () => {
  const valid = {
    agents_online: 128,
    tasks_per_sec: 0.42,
    avg_completion: 0.97,
    avg_trust: 4.6,
    throughput: [1, 2, 3],
    skills: [{ name: "code", pct: 62, tone: "violet" }],
  };

  it("accepts a valid payload (extra keys tolerated)", () => {
    expect(isOverview({ ...valid, extra: "ignored" })).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isOverview(null)).toBe(false);
    expect(isOverview([])).toBe(false);
    expect(isOverview("<html>proxy error</html>")).toBe(false);
  });

  it("rejects a throughput array containing non-numbers", () => {
    expect(isOverview({ ...valid, throughput: [1, "2", 3] })).toBe(false);
  });

  it("rejects a string avg_completion", () => {
    expect(isOverview({ ...valid, avg_completion: "0.97" })).toBe(false);
  });

  it("rejects a skills entry without a numeric pct", () => {
    expect(isOverview({ ...valid, skills: [{ name: "code" }] })).toBe(false);
  });
});

describe("isFlow", () => {
  const valid = {
    nodes: [
      { id: "in", label: "intent", sub: "user input", x: 4, y: 50 },
      { id: "out", label: "outcome", sub: "verified", x: 96, y: 50 },
    ],
    edges: [["in", "out"]],
  };

  it("accepts a valid graph (empty nodes and edges included)", () => {
    expect(isFlow(valid)).toBe(true);
    expect(isFlow({ nodes: [], edges: [] })).toBe(true);
  });

  it("rejects a payload with no edges array (destructured during render)", () => {
    const { edges: _drop, ...rest } = valid;
    expect(isFlow(rest)).toBe(false);
    expect(isFlow({ ...valid, edges: {} })).toBe(false);
  });

  it("rejects edges that are not string pairs", () => {
    expect(isFlow({ ...valid, edges: [["in"]] })).toBe(false);
    expect(isFlow({ ...valid, edges: [["in", "out", "extra"]] })).toBe(false);
    expect(isFlow({ ...valid, edges: [[1, 2]] })).toBe(false);
    expect(isFlow({ ...valid, edges: [{ from: "in", to: "out" }] })).toBe(
      false,
    );
  });

  it("rejects a node without numeric coordinates", () => {
    const node = {
      id: "in",
      label: "intent",
      sub: "user input",
      x: "4",
      y: 50,
    };
    expect(isFlow({ ...valid, nodes: [node] })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isFlow(null)).toBe(false);
    expect(isFlow([])).toBe(false);
  });
});

describe("isTaskList", () => {
  const task = {
    id: "tsk_01",
    intent: "build tetris",
    agents: 3,
    spent: 0.054,
    status: "complete",
    started: "2m ago",
  };

  it("accepts a valid list and the empty list", () => {
    expect(isTaskList([task])).toBe(true);
    expect(isTaskList([])).toBe(true);
  });

  it("rejects a non-array and items with a non-numeric spent", () => {
    expect(isTaskList({ tasks: [task] })).toBe(false);
    expect(isTaskList([{ ...task, spent: "0.054" }])).toBe(false);
    expect(isTaskList([task, { ...task, spent: undefined }])).toBe(false);
  });
});

describe("isDecomposeResponse", () => {
  const valid = {
    plan_id: "pln_1",
    intent: "tetris",
    steps: [
      {
        agent_id: "agt_01",
        rationale: "codes",
        est_price_usdc: 0.03,
        est_eta_seconds: 4.5,
      },
    ],
    total_usdc: 0.03,
    total_eta: 4.5,
  };

  it("accepts a valid plan (empty steps included)", () => {
    expect(isDecomposeResponse(valid)).toBe(true);
    expect(isDecomposeResponse({ ...valid, steps: [] })).toBe(true);
  });

  it("rejects a non-numeric total_usdc", () => {
    expect(isDecomposeResponse({ ...valid, total_usdc: "0.03" })).toBe(false);
  });

  it("rejects a step with a missing price estimate", () => {
    const step = { agent_id: "agt_01", est_eta_seconds: 4.5 };
    expect(isDecomposeResponse({ ...valid, steps: [step] })).toBe(false);
  });
});

describe("isReputationBatch", () => {
  const rep = {
    agent_id: "agt_01",
    smoothed_bps: 7000,
    lower_bound_bps: 5677,
    avg_bps: 0,
    count: 0,
    weight: 0,
    disputed: 0,
    dispute_rate_bps: 0,
    source: "prior",
  };
  const valid = {
    reputations: { agt_01: rep },
    floor_bps: 5500,
    prior_bps: 7000,
  };

  it("accepts a valid batch (empty reputations included)", () => {
    expect(isReputationBatch(valid)).toBe(true);
    expect(isReputationBatch({ ...valid, reputations: {} })).toBe(true);
  });

  it("rejects an entry with a non-numeric smoothed_bps", () => {
    const bad = { ...rep, smoothed_bps: null };
    expect(isReputationBatch({ ...valid, reputations: { agt_01: bad } })).toBe(
      false,
    );
  });

  it("rejects a batch without a numeric floor_bps", () => {
    expect(isReputationBatch({ ...valid, floor_bps: undefined })).toBe(false);
  });
});

describe("isReputationParams", () => {
  const valid = {
    enabled: true,
    prior_bps: 7000,
    prior_weight_usdc: 12,
    floor_bps: 5500,
    max_rating_weight_usdc: 100,
    read_ttl_seconds: 15,
    wilson_z: 1,
    epoch_seconds: 604_800,
    decay_bps_per_epoch: 9250,
    max_decay_epochs: 96,
    contract_id: "CDCS",
    network: "testnet",
  };

  it("accepts a valid parameter set (extra keys tolerated)", () => {
    expect(isReputationParams({ ...valid, extra: 1 })).toBe(true);
  });

  it("rejects a missing epoch_seconds (divided by 86400)", () => {
    const { epoch_seconds: _drop, ...rest } = valid;
    expect(isReputationParams(rest)).toBe(false);
  });

  it("rejects a missing decay_bps_per_epoch (divided by 100)", () => {
    const { decay_bps_per_epoch: _drop, ...rest } = valid;
    expect(isReputationParams(rest)).toBe(false);
  });

  it("rejects non-numeric smoothing inputs that would render ★ NaN", () => {
    expect(isReputationParams({ ...valid, prior_weight_usdc: "12" })).toBe(
      false,
    );
    expect(isReputationParams({ ...valid, wilson_z: null })).toBe(false);
    expect(isReputationParams({ ...valid, floor_bps: undefined })).toBe(false);
  });

  it("rejects a non-string contract_id or network", () => {
    expect(isReputationParams({ ...valid, contract_id: 7 })).toBe(false);
    expect(isReputationParams({ ...valid, network: null })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isReputationParams(null)).toBe(false);
    expect(isReputationParams([])).toBe(false);
  });
});

describe("isArtifactResponse", () => {
  const artifact = {
    title: "Tetris",
    summary: "playable tetris",
    files: [{ path: "index.html", language: "html", content: "<html/>" }],
    entry: "index.html",
    preview_html: "<html/>",
  };

  it("accepts a sealed artifact and a null artifact", () => {
    expect(
      isArtifactResponse({ artifact, charge_tx: "abc", proof_tx: null }),
    ).toBe(true);
    expect(isArtifactResponse({ artifact: null })).toBe(true);
  });

  it("rejects an artifact whose files entries lack string content", () => {
    const bad = { ...artifact, files: [{ path: "index.html", content: 42 }] };
    expect(isArtifactResponse({ artifact: bad })).toBe(false);
  });

  it("rejects non-object payloads", () => {
    expect(isArtifactResponse(null)).toBe(false);
    expect(isArtifactResponse("gateway timeout")).toBe(false);
  });
});

describe("isStellarNetworkInfo", () => {
  const valid = {
    network: "testnet",
    rpc_url: "https://soroban-testnet.stellar.org",
    network_passphrase: "Test SDF Network ; September 2015",
    admin: "GABC",
    contracts: { reputation: "CDCS", escrow: "CAAA" },
    asset: "USDC",
    asset_sac: "CBBB12345678",
  };

  it("accepts a valid payload (empty contracts included)", () => {
    expect(isStellarNetworkInfo(valid)).toBe(true);
    expect(isStellarNetworkInfo({ ...valid, contracts: {} })).toBe(true);
  });

  it("rejects non-string contract ids", () => {
    expect(
      isStellarNetworkInfo({ ...valid, contracts: { reputation: 7 } }),
    ).toBe(false);
  });

  it("rejects a missing asset_sac", () => {
    const { asset_sac: _drop, ...rest } = valid;
    expect(isStellarNetworkInfo(rest)).toBe(false);
  });
});
