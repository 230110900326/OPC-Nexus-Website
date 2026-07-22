import type { ReactNode } from "react";
import { pageMetadata } from "../../lib/metadata";

export const metadata = pageMetadata({ title: "政策与监管", description: "查看政策原文摘要、发文机关、适用地区与影响行业。", path: "/policies" });
export default function PoliciesLayout({ children }: { children: ReactNode }) { return children; }
