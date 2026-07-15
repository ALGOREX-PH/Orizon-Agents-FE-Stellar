import { cn } from "@/lib/utils";

/**
 * Key-value row for definition lists (session details, receipts, tx facts).
 * `children` renders custom value content (links, multi-line); `value` is the
 * plain-text shorthand. `divider` draws the bordered dl style used inside
 * cards; without it the row is a bare flex line (tx-status style).
 */
export function KVRow({
  k,
  value,
  divider = true,
  valueClassName,
  children,
}: {
  k: string;
  value?: string;
  divider?: boolean;
  valueClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4",
        divider
          ? "border-b border-border/40 pb-2 last:border-0"
          : "items-baseline flex-wrap",
      )}
    >
      <dt className="text-muted text-[10px] uppercase tracking-widest pt-1">
        {k}
      </dt>
      <dd className={cn("text-right break-all text-text", valueClassName)}>
        {children ?? value}
      </dd>
    </div>
  );
}
