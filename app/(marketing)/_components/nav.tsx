"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { ConnectWallet } from "@/components/ui/connect-wallet";
import { cn } from "@/lib/utils";

const links = [
  { href: "#solution", label: "Product" },
  { href: "#architecture", label: "Architecture" },
  { href: "#use-cases", label: "Use Cases" },
  { href: "#roadmap", label: "Roadmap" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-bg/70 backdrop-blur-xl border-b border-border"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted hover:text-text transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ConnectWallet size="sm" className="hidden md:flex" />
          <ButtonLink href="/app" size="sm" variant="primary">
            Launch App ▸
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
