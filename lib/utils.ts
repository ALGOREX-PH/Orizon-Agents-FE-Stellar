import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** snake_case → Title Case ("payment_escrow" → "Payment Escrow"). */
export function prettyName(s: string): string {
  return s
    .split("_")
    .map((w) => (w[0]?.toUpperCase() ?? "") + w.slice(1))
    .join(" ");
}
