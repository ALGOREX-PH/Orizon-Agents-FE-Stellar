import type { MetadataRoute } from "next";

const base = "https://orizons.xyz";

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
