import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/metadata";

export const revalidate = 3600;

const publicRoutes = [
  "", "/discover", "/news", "/policies", "/insights", "/videos", "/community", "/events",
  "/demands", "/rankings", "/search", "/about", "/faq", "/contact", "/terms", "/privacy",
  "/community/rules", "/copyright", "/disclaimer", "/demands/rules",
];

type ArticleEnvelope = { success?: boolean; data?: { items?: Array<{ slug: string; updatedAt?: string }> } };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl().origin;
  const now = new Date();
  const entries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${origin}${route || "/"}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));

  const api = process.env.API_INTERNAL_URL?.trim();
  if (!api || !/^https?:\/\//i.test(api)) return entries;
  try {
    const response = await fetch(`${api.replace(/\/$/, "")}/articles?limit=100`, { next: { revalidate: 3600 } });
    const body = await response.json() as ArticleEnvelope;
    if (response.ok && body.success) {
      for (const article of body.data?.items ?? []) entries.push({
        url: `${origin}/articles/${encodeURIComponent(article.slug)}`,
        lastModified: article.updatedAt ? new Date(article.updatedAt) : now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // The static route list remains valid while the API is starting or unavailable.
  }
  return entries;
}
