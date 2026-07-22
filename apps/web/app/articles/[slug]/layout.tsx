import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "../../../lib/metadata";

type ArticleMeta = { title: string; summary: string; coverImageUrl?: string | null };
type Envelope = { success?: boolean; data?: ArticleMeta };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const path = `/articles/${encodeURIComponent(slug)}`;
  const api = process.env.API_INTERNAL_URL?.trim();
  if (api && /^https?:\/\//i.test(api)) {
    try {
      const response = await fetch(`${api.replace(/\/$/, "")}/articles/${encodeURIComponent(slug)}`, { next: { revalidate: 600 } });
      const body = await response.json() as Envelope;
      if (response.ok && body.success && body.data) {
        const metadata = pageMetadata({ title: body.data.title, description: body.data.summary, path, type: "article" });
        if (body.data.coverImageUrl && metadata.openGraph && typeof metadata.openGraph === "object") metadata.openGraph.images = [body.data.coverImageUrl];
        return metadata;
      }
    } catch {
      // Fall through to a stable metadata fallback while the API is unavailable.
    }
  }
  return pageMetadata({ title: "内容摘要", description: "OPC Nexus 财经与产业内容摘要。", path, type: "article" });
}

export default function ArticleLayout({ children }: { children: ReactNode }) { return children; }
