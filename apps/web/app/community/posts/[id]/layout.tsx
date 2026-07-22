import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "../../../../lib/metadata";

type PostEnvelope = { success?: boolean; data?: { title: string; body: string } };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const path = `/community/posts/${encodeURIComponent(id)}`;
  const api = process.env.API_INTERNAL_URL?.trim();
  if (api && /^https?:\/\//i.test(api)) {
    try {
      const response = await fetch(`${api.replace(/\/$/, "")}/forum/posts/${encodeURIComponent(id)}`, { next: { revalidate: 300 } });
      const body = await response.json() as PostEnvelope;
      if (response.ok && body.success && body.data) return pageMetadata({ title: body.data.title, description: body.data.body.slice(0, 150), path, type: "article" });
    } catch {
      // Keep the fallback metadata available during API restarts.
    }
  }
  return pageMetadata({ title: "社区讨论", description: "OPC Nexus 同行社区讨论。", path, type: "article" });
}

export default function ForumPostLayout({ children }: { children: ReactNode }) { return children; }
