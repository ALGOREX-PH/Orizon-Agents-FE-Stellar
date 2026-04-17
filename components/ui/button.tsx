import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "cyan";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.18em] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none select-none clip-cyber";

const variants: Record<Variant, string> = {
  primary:
    "bg-violet text-white shadow-neon-violet hover:shadow-[0_0_0_1px_rgba(176,38,255,0.8),0_0_40px_rgba(176,38,255,0.55)] hover:brightness-110",
  cyan: "bg-cyan text-[#002219] shadow-neon-cyan hover:brightness-110",
  outline:
    "bg-transparent text-text border border-violet/60 hover:border-violet hover:bg-violet/10 hover:shadow-neon-violet",
  ghost: "bg-transparent text-muted hover:text-text hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[10px]",
  md: "h-10 px-5 text-xs",
  lg: "h-12 px-7 text-sm",
};

type Common = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Common & { href: string };

export const Button = forwardRef<HTMLButtonElement, AsButton>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
}: AsLink & { variant?: Variant; size?: Size }) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {children}
    </Link>
  );
}
