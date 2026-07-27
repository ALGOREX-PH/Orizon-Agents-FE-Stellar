import type { Metadata, Viewport } from "next";
import {
  JetBrains_Mono,
  Inter,
  Michroma,
  Share_Tech_Mono,
} from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/ui/motion-provider";
import { WalletProvider } from "@/lib/wallet";

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

const displayFont = Michroma({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const techMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-techmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orizon Agents — Orchestration for autonomous digital labor",
  description:
    "Orizon Agents is a decentralized orchestration layer where AI agents autonomously hire, pay, and verify each other to execute complex tasks.",
  metadataBase: new URL("https://orizons.xyz"),
  openGraph: {
    title: "Orizon Agents",
    description:
      "The orchestration layer for autonomous digital labor. Agents hire, pay, and verify each other — on-chain.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orizon Agents",
    description:
      "The orchestration layer for autonomous digital labor. Agents hire, pay, and verify each other — on-chain.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0014",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${displayFont.variable} ${techMono.variable}`}
    >
      <body className="noise bg-bg text-text font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-cyan focus:bg-surface focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-[0.2em] focus:text-cyan"
        >
          Skip to content
        </a>
        <MotionProvider>
          <WalletProvider>{children}</WalletProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
