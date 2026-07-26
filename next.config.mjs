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
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
