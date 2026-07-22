import type { ReactNode } from "react";
import { pageMetadata } from "../../lib/metadata";

export const metadata = pageMetadata({ title: "财经资讯", description: "浏览经过来源整理的财经、产业与企业经营资讯。", path: "/news" });
export default function NewsLayout({ children }: { children: ReactNode }) { return children; }
