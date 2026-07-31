import { describe, expect, it } from "vitest";

import { normalizeApiBase, resolveApiBase } from "./api-base.mjs";

const FALLBACK = "http://localhost:8000";
const RENDER = "https://orizon-agents-be-stellar.onrender.com";

describe("normalizeApiBase", () => {
  it("leaves a bare origin untouched", () => {
    expect(normalizeApiBase(RENDER, FALLBACK)).toBe(RENDER);
  });

  // The production outage this module exists to prevent: a trailing slash made
  // the rewrite emit `//api/agents`, which the backend 404s.
  it("drops a trailing slash", () => {
    expect(normalizeApiBase(`${RENDER}/`, FALLBACK)).toBe(RENDER);
    expect(normalizeApiBase(`${RENDER}///`, FALLBACK)).toBe(RENDER);
  });

  // The other spelling of the same outage: `/api/api/agents`.
  it("drops a trailing /api because the rewrite appends its own", () => {
    expect(normalizeApiBase(`${RENDER}/api`, FALLBACK)).toBe(RENDER);
    expect(normalizeApiBase(`${RENDER}/api/`, FALLBACK)).toBe(RENDER);
  });

  it("keeps a genuine path prefix while dropping the /api suffix", () => {
    expect(
      normalizeApiBase("https://gw.example.com/gateway/api", FALLBACK),
    ).toBe("https://gw.example.com/gateway");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeApiBase(`  ${RENDER}/api  `, FALLBACK)).toBe(RENDER);
  });

  it("preserves an explicit port", () => {
    expect(normalizeApiBase("http://localhost:8000/api", FALLBACK)).toBe(
      "http://localhost:8000",
    );
  });

  it("falls back when the value is missing or blank", () => {
    expect(normalizeApiBase(undefined, FALLBACK)).toBe(FALLBACK);
    expect(normalizeApiBase("", FALLBACK)).toBe(FALLBACK);
    expect(normalizeApiBase("   ", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects values that could never proxy correctly", () => {
    expect(() => normalizeApiBase("not-a-url", FALLBACK)).toThrow(
      /absolute URL/,
    );
    expect(() => normalizeApiBase("ftp://example.com", FALLBACK)).toThrow(
      /http or https/,
    );
    expect(() => normalizeApiBase("https://example.com?a=1", FALLBACK)).toThrow(
      /query string or fragment/,
    );
    expect(() => normalizeApiBase("https://example.com#x", FALLBACK)).toThrow(
      /query string or fragment/,
    );
  });
});

describe("resolveApiBase", () => {
  it("uses the production backend on Vercel when unset", () => {
    expect(resolveApiBase({ VERCEL: "1" })).toBe(RENDER);
  });

  it("uses localhost off Vercel when unset", () => {
    expect(resolveApiBase({})).toBe(FALLBACK);
  });

  it("normalizes a configured value over the fallback", () => {
    expect(
      resolveApiBase({ VERCEL: "1", NEXT_PUBLIC_API_BASE: `${RENDER}/api/` }),
    ).toBe(RENDER);
  });
});
