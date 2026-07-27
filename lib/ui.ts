/**
 * Keyboard-focus ring shared by every interactive element.
 *
 * Uses an INSET ring: the cyber clip-paths (`clip-cyber`/`clip-cyber-sm`)
 * clip any box-shadow painted outside the element, so an offset ring would
 * be invisible. An inset ring survives the clip.
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan";

/** Shared form-input styling used across the PDAX panels. */
export const inputCls =
  "w-full bg-bg/60 border border-border px-3 py-2 text-sm font-mono outline-none focus:border-violet";

/** Badge tones used for status rendering (subset of the Badge component's Tone). */
export type StatusTone = "success" | "magenta" | "cyan" | "muted";

/** Status → Badge tone map (superset of the per-panel maps). */
export const statusTones: Record<string, StatusTone> = {
  completed: "success",
  failed: "magenta",
  awaiting_payment: "cyan",
};

/** Map a status string to a Badge tone. Case-insensitive; unknown statuses → muted. */
export function statusTone(status: string): StatusTone {
  return statusTones[status.toLowerCase()] ?? "muted";
}
