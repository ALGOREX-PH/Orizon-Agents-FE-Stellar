import { cn } from "@/lib/utils";

export function GridBg({
  className,
  fade = true,
}: {
  className?: string;
  fade?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10", className)}
    >
      <div className="absolute inset-0 grid-bg animate-gridDrift" />
      {fade && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0A0014_80%)]" />
      )}
    </div>
  );
}

export function Glow({
  color = "violet",
  className,
}: {
  color?: "violet" | "cyan" | "magenta";
  className?: string;
}) {
  const palette = {
    violet: "bg-[radial-gradient(closest-side,rgba(176,38,255,0.55),transparent)]",
    cyan: "bg-[radial-gradient(closest-side,rgba(0,255,209,0.35),transparent)]",
    magenta:
      "bg-[radial-gradient(closest-side,rgba(255,46,154,0.45),transparent)]",
  };
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl animate-pulseGlow -z-10",
        palette[color],
        className,
      )}
    />
  );
}

export function Scanline() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-24 -z-10 opacity-40 animate-scan bg-gradient-to-b from-transparent via-cyan/40 to-transparent"
    />
  );
}
