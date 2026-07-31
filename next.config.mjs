/** @type {import('next').NextConfig} */
import { resolveApiBase } from "./lib/api-base.mjs";

// Normalized so a trailing slash or a trailing `/api` in the configured value
// cannot corrupt the rewrite target below. On Vercel a missing value falls back
// to the production backend so the proxy can never point at localhost.
const API_BASE = resolveApiBase(process.env);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            // Conservative CSP: hardens plugin/base/framing/form vectors only.
            // Deliberately no default-src/script-src/style-src/connect-src —
            // a nonce-based CSP would force dynamic rendering and break the
            // artifact preview iframe. Deferred intentionally.
            key: "Content-Security-Policy",
            value:
              "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
