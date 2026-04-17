import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0014",
        surface: "#0F0020",
        "surface-2": "#14002E",
        border: "rgba(176, 38, 255, 0.18)",
        violet: {
          DEFAULT: "#B026FF",
          soft: "#7C3AED",
          deep: "#4C1D95",
        },
        cyan: {
          DEFAULT: "#00FFD1",
        },
        magenta: {
          DEFAULT: "#FF2E9A",
        },
        text: "#F5F3FF",
        muted: "#A79FC7",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "neon-violet":
          "0 0 0 1px rgba(176, 38, 255, 0.5), 0 0 24px rgba(176, 38, 255, 0.35), 0 0 60px rgba(176, 38, 255, 0.15)",
        "neon-cyan":
          "0 0 0 1px rgba(0, 255, 209, 0.45), 0 0 24px rgba(0, 255, 209, 0.3)",
        "neon-magenta":
          "0 0 0 1px rgba(255, 46, 154, 0.5), 0 0 24px rgba(255, 46, 154, 0.3)",
        "inner-glow": "inset 0 0 40px rgba(176, 38, 255, 0.12)",
      },
      backgroundImage: {
        grid:
          "linear-gradient(rgba(176, 38, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(176, 38, 255, 0.08) 1px, transparent 1px)",
        "grid-fade":
          "radial-gradient(ellipse at center, #0A0014 0%, #0A0014 40%, transparent 80%)",
        "violet-radial":
          "radial-gradient(ellipse at center, rgba(176, 38, 255, 0.35) 0%, transparent 60%)",
        "cyan-radial":
          "radial-gradient(ellipse at center, rgba(0, 255, 209, 0.2) 0%, transparent 60%)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.65" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        gridDrift: {
          "0%": { backgroundPosition: "0 0, 0 0" },
          "100%": { backgroundPosition: "48px 48px, 48px 48px" },
        },
      },
      animation: {
        scan: "scan 6s linear infinite",
        flicker: "flicker 3s ease-in-out infinite",
        pulseGlow: "pulseGlow 4s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        gridDrift: "gridDrift 20s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
