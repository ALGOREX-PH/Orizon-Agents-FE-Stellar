import { afterEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn();
vi.mock("@vercel/analytics", () => ({
  track: (...a: unknown[]) => trackMock(...a),
}));

import { reportClientError } from "./report-error";

describe("reportClientError", () => {
  afterEach(() => {
    trackMock.mockReset();
    vi.restoreAllMocks();
  });

  it("emits the client-error event with the digest and message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    reportClientError(Object.assign(new Error("boom"), { digest: "d1" }));
    expect(trackMock).toHaveBeenCalledWith("client-error", {
      digest: "d1",
      message: "boom",
    });
  });

  it("falls back to 'none' when there is no digest", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    reportClientError(new Error("no digest"));
    expect(trackMock).toHaveBeenCalledWith("client-error", {
      digest: "none",
      message: "no digest",
    });
  });

  it("truncates the message to 120 characters", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    reportClientError(new Error("x".repeat(500)));
    const arg = trackMock.mock.calls[0][1] as { message: string };
    expect(arg.message).toHaveLength(120);
  });

  it("never throws when telemetry throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    trackMock.mockImplementation(() => {
      throw new Error("analytics down");
    });
    expect(() => reportClientError(new Error("boom"))).not.toThrow();
  });

  it("logs the error to the console for local debugging", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");
    reportClientError(err);
    expect(spy).toHaveBeenCalledWith(err);
  });
});
