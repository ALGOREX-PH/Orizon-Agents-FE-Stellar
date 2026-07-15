import type { MetadataRoute } from "next";

const base = "https://orizon-agents-fe-stellar.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: base,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/app`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
