import { track } from "@vercel/analytics";

/**
 * Report a client-side render error to telemetry.
 *
 * Shared by every error boundary (`app/error`, `app/global-error`,
 * `app/app/error`) so the event name, the digest fallback, the message
 * truncation, and the "telemetry must never throw inside a boundary"
 * guarantee are defined in exactly one place. A boundary is the last line of
 * defence, so a failure in `track()` here must never mask the error the
 * boundary is rendering.
 */
export function reportClientError(error: Error & { digest?: string }): void {
  console.error(error);
  try {
    track("client-error", {
      digest: error.digest ?? "none",
      message: String(error.message).slice(0, 120),
    });
  } catch {
    // Telemetry must never throw inside an error boundary.
  }
}
