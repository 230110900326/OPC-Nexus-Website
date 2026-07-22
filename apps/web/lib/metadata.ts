import type { Metadata } from "next";

export const defaultDescription = "面向财经、产业、投资与企业经营者的专业内容、行业交流与供需协作平台。";
export const shareImage = "/brand/opc-nexus-full.png";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  try {
    return new URL(configured);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function pageMetadata(input: { title: string; description: string; path: string; type?: "website" | "article"; noIndex?: boolean }): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      type: input.type ?? "website",
      locale: "zh_CN",
      siteName: "OPC Nexus",
      title: `${input.title} | OPC Nexus`,
      description: input.description,
      url: input.path,
      images: [{ url: shareImage, alt: "OPC Nexus" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${input.title} | OPC Nexus`,
      description: input.description,
      images: [shareImage],
    },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
