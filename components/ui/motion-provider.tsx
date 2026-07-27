"use client";
import { LazyMotion, MotionConfig } from "framer-motion";

// Async feature loading: the ~56KB domAnimation bundle is fetched on demand
// instead of shipping with the root layout. `strict` enforces `m.` components
// so a stray `motion.` import can't silently pull the full bundle back in.
const loadFeatures = () =>
  import("framer-motion").then((mod) => mod.domAnimation);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion strict features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
