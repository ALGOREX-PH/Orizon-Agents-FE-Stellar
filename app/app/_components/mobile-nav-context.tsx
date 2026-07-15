"use client";
/**
 * Tiny context shared between Sidebar (the drawer) and Topbar (the hamburger).
 * Mobile-only — desktop ignores `open` because the sidebar is always rendered.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const MobileNavCtx = createContext<Ctx | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  // Memoize so consumers don't re-render on every provider render — the
  // object identity only changes when `open` actually flips.
  const value = useMemo<Ctx>(() => ({ open, setOpen, toggle }), [open, toggle]);
  return (
    <MobileNavCtx.Provider value={value}>{children}</MobileNavCtx.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavCtx);
  if (!ctx) throw new Error("useMobileNav must be inside <MobileNavProvider>");
  return ctx;
}
