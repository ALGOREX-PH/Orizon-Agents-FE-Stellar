import { cn } from "@/lib/utils";

export type StellarExpertKind = "tx" | "account" | "contract";

/** Canonical stellar.expert explorer URL for a tx / account / contract. */
export function stellarExpertUrl(
  kind: StellarExpertKind,
  id: string,
  network: string = "testnet",
): string {
  return `https://stellar.expert/explorer/${network}/${kind}/${id}`;
}

/**
 * External link to stellar.expert. Styling is caller-provided via className
 * (call sites range from inline text links to cyber-button chips); the URL
 * shape, target, and rel live here so explorer links can't drift.
 */
export function StellarExpertLink({
  kind,
  id,
  network = "testnet",
  className,
  children,
}: {
  kind: StellarExpertKind;
  id: string;
  network?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={stellarExpertUrl(kind, id, network)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "font-mono text-[10px] uppercase tracking-widest text-cyan hover:text-text",
        className,
      )}
    >
      {children ?? "view on stellar.expert ▸"}
    </a>
  );
}
