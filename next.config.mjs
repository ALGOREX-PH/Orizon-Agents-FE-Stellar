/** @type {import('next').NextConfig} */
// On Vercel, fall back to the production backend so a missing env var can
// never point the /api proxy at localhost.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (process.env.VERCEL
    ? "https://orizon-agents-be-stellar.onrender.com"
    : "http://localhost:8000");

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
