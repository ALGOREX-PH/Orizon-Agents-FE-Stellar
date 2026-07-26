import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  // tsconfig sets jsx: "preserve" for Next's compiler; vitest's transform
  // needs JSX compiled so tests can import .tsx modules.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "contract/**", "backend/**"],
    reporters: "verbose",
  },
});
