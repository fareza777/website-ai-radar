import type { MetadataRoute } from "next";
import { LABS } from "@/config/labs";
import { getLabItems, getStatus } from "@/lib/data";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const updated = getStatus()?.generatedAt;
  const lastModified = updated ? new Date(updated) : undefined;
  return [
    { url: `${base}/`, lastModified, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/labs`, lastModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/discover`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/deals`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/status`, lastModified, changeFrequency: "daily", priority: 0.3 },
    ...LABS.map((l) => {
      const latest = getLabItems(l.slug)[0]?.publishedAt;
      return { url: `${base}/labs/${l.slug}`, lastModified: latest ? new Date(latest) : lastModified, changeFrequency: "hourly" as const, priority: 0.7 };
    }),
  ];
}
