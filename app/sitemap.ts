import type { MetadataRoute } from "next";

const base = "https://orizons.xyz";

// /app is deliberately absent: the console is robots-noindexed, and
// advertising a noindexed route in the sitemap is contradictory.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
