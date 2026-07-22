import type { ReactNode } from "react";
import { pageMetadata } from "../../lib/metadata";

export const metadata = pageMetadata({ title: "行业洞察", description: "阅读面向 OPC 从业者的行业分析、经营方法与专业判断。", path: "/insights" });
export default function InsightsLayout({ children }: { children: ReactNode }) { return children; }
