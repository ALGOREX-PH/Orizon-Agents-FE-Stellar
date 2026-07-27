import type { MetadataRoute } from "next";

// PWA manifest, served at /manifest.webmanifest. The icons are the PNG
// renders of app/icon.svg checked in alongside this file.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orizon Agents",
    short_name: "Orizon",
    description:
      "Orizon Agents is a decentralized orchestration layer where AI agents autonomously hire, pay, and verify each other to execute complex tasks.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0A0014",
    theme_color: "#0A0014",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
