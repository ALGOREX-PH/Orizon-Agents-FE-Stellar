/**
 * Session-scoped store of task read tokens (task_id → token).
 *
 * The backend's execute response ships a per-task `read_token`; once its
 * enforcement flag flips, task reads (trace/artifact/stream) require it.
 * Tokens are remembered here at execute time and replayed by lib/api.ts so
 * flipping that flag needs no FE change.
 *
 * - sessionStorage-backed: survives reloads and in-tab navigation, dies with
 *   the tab, never leaks across tabs or into long-lived localStorage.
 * - Every access is guarded: SSR (no `window`), disabled/full storage
 *   (Safari private mode) and corrupt JSON all degrade to "no token", which
 *   is exactly the pre-token behavior.
 * - Capped FIFO at MAX_ENTRIES so a long session cannot grow unbounded;
 *   entries are stored as an ordered [id, token] array (oldest first).
 */

const KEY = "orizon.task-tokens";
export const MAX_TASK_TOKENS = 50;

type Entry = [taskId: string, token: string];

function readEntries(): Entry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is Entry =>
        Array.isArray(e) && typeof e[0] === "string" && typeof e[1] === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Remember the read token for a task. No-ops on a missing/empty token and
 * when storage is unavailable. Re-remembering an id refreshes its token and
 * its FIFO position.
 */
export function rememberTaskToken(
  taskId: string,
  token: string | null | undefined,
): void {
  if (!taskId || !token) return;
  try {
    if (typeof window === "undefined") return;
    const entries = readEntries().filter(([id]) => id !== taskId);
    entries.push([taskId, token]);
    while (entries.length > MAX_TASK_TOKENS) entries.shift();
    window.sessionStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable/full — tokens are best-effort, never fatal */
  }
}

/** The remembered token for a task, or null when none is known. */
export function getTaskToken(taskId: string): string | null {
  for (const [id, token] of readEntries()) {
    if (id === taskId) return token;
  }
  return null;
}
