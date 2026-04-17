import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 group select-none",
        className,
      )}
    >
      <span className="relative inline-flex h-8 w-8 items-center justify-center">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="h-8 w-8 drop-shadow-[0_0_6px_rgba(176,38,255,0.7)]"
        >
          <path
            d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
            stroke="#B026FF"
            strokeWidth="1.5"
            fill="rgba(176,38,255,0.08)"
          />
          <path
            d="M16 8 L22 11.5 L22 20.5 L16 24 L10 20.5 L10 11.5 Z"
            stroke="#00FFD1"
            strokeWidth="1"
            fill="none"
          />
          <circle cx="16" cy="16" r="2" fill="#00FFD1" />
        </svg>
      </span>
      <span className="font-mono text-sm font-semibold uppercase tracking-[0.25em] neon-text">
        Orizon
      </span>
    </Link>
  );
}
