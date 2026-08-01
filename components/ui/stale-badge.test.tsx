// @vitest-environment jsdom
/**
 * Unit tests for StaleBadge.
 *
 * The badge is the only thing standing between the user and a frozen number
 * presented as live — the console kept showing last-good balances and metrics
 * through the outage with no marker at all. Two guards decide whether it
 * renders, and both matter: a page that never loaded is *failed*, not stale,
 * and dating it would be a lie in the other direction.
 *
 * Assertions are plain DOM checks — this repo does not install jest-dom.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { StaleBadge, formatAge } from "./stale-badge";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("formatAge", () => {
  it("reads coarsely so it does not tick every second", () => {
    expect(formatAge(3_000)).toBe("just now");
    expect(formatAge(42_000)).toBe("42s ago");
    expect(formatAge(3 * 60_000)).toBe("3m ago");
    expect(formatAge(5 * 3_600_000)).toBe("5h ago");
    expect(formatAge(3 * 86_400_000)).toBe("3d ago");
  });

  it("clamps a future timestamp instead of printing negative age", () => {
    expect(formatAge(-9_000)).toBe("just now");
  });
});

describe("StaleBadge", () => {
  it("renders nothing while the data is live", () => {
    const { container } = render(
      <StaleBadge stale={false} lastSuccessAt={Date.now() - 60_000} />,
    );
    expect(container.innerHTML).toBe("");
  });

  // The distinction the component exists to enforce: never loaded is a
  // failure (ErrorNote's job), not stale data.
  it("renders nothing when nothing ever loaded", () => {
    const { container } = render(<StaleBadge stale lastSuccessAt={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("marks frozen data as stale with its age", () => {
    render(<StaleBadge stale lastSuccessAt={Date.now() - 120_000} />);
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toContain("stale");
    expect(text).toContain("2m ago");
  });

  // Polite status, not an alert: the failure itself is announced elsewhere,
  // and the announcement names an absolute time so it does not re-fire as the
  // relative age ticks over during a long outage.
  it("announces a fixed absolute time rather than the ticking age", () => {
    const lastSuccessAt = Date.now() - 120_000;
    render(<StaleBadge stale lastSuccessAt={lastSuccessAt} what="balances" />);

    const status = screen.getByRole("status");
    const at = new Date(lastSuccessAt).toLocaleTimeString();
    expect(status.getAttribute("title")).toContain("balances");
    expect(status.textContent ?? "").toContain(`last updated at ${at}`);
  });

  it("keeps counting instead of freezing at first render", async () => {
    vi.useFakeTimers();
    const lastSuccessAt = Date.now() - 120_000;
    render(<StaleBadge stale lastSuccessAt={lastSuccessAt} />);
    expect(screen.getByRole("status").textContent ?? "").toContain("2m ago");

    await vi.advanceTimersByTimeAsync(60_000);
    expect(screen.getByRole("status").textContent ?? "").toContain("3m ago");
  });
});
