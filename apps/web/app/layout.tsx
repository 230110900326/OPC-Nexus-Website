import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { defaultDescription, getSiteUrl, shareImage } from "../lib/metadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: "OPC Nexus",
  title: {
    default: "OPC Nexus | 洞察 · 链接 · 增长",
    template: "%s | OPC Nexus",
  },
  description: defaultDescription,
  keywords: ["财经", "产业", "政策", "OPC", "一人公司", "行业社群", "企业经营"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "OPC Nexus",
    title: "OPC Nexus | 洞察 · 链接 · 增长",
    description: defaultDescription,
    url: "/",
    images: [{ url: shareImage, alt: "OPC Nexus" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OPC Nexus | 洞察 · 链接 · 增长",
    description: defaultDescription,
    images: [shareImage],
  },
  robots: { index: true, follow: true },
  category: "finance",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body id="top">{children}<SiteFooter /></body></html>;
}
