import { cn } from "@/lib/utils";

export function Marquee({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  const doubled = [...items, ...items];
  return (
    <div
      className={cn(
        "relative overflow-hidden border-y border-border py-4 bg-surface/40",
        className,
      )}
    >
      <div className="flex w-max animate-marquee gap-12">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="font-mono text-xs uppercase tracking-[0.3em] text-muted flex items-center gap-3"
          >
            <span className="text-violet">◆</span>
            {item}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg to-transparent" />
    </div>
  );
}
