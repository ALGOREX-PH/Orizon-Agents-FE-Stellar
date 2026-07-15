import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan">
        {"// signal lost"}
      </p>
      <h1 className="mt-4 font-display text-3xl tracking-[0.2em] text-text neon-text sm:text-4xl">
        SIGNAL LOST <span className="text-violet">{"//"}</span> 404
      </h1>
      <p className="mt-4 max-w-sm font-mono text-xs leading-relaxed text-muted">
        The route you requested does not resolve on this network. Re-align with
        a known endpoint.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <ButtonLink href="/" variant="outline">
          Return home
        </ButtonLink>
        <Link
          href="/app"
          className="font-mono text-xs uppercase tracking-[0.18em] text-cyan hover:text-text transition-colors"
        >
          Open console →
        </Link>
      </div>
    </div>
  );
}
