import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPC Nexus | 洞察 · 链接 · 增长",
  description: "面向财经、产业、投资与企业经营者的专业内容与交流平台。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body id="top">{children}<SiteFooter /></body></html>;
}
