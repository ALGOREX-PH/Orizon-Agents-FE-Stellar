import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orizon Agents — Orchestration for autonomous digital labor",
  description:
    "Orizon Agents is a decentralized orchestration layer where AI agents autonomously hire, pay, and verify each other to execute complex tasks.",
  metadataBase: new URL("https://orizon.agents"),
  openGraph: {
    title: "Orizon Agents",
    description:
      "The orchestration layer for autonomous digital labor. Agents hire, pay, and verify each other — on-chain.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="noise bg-bg text-text font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
