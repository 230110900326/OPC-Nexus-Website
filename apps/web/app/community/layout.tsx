import type { ReactNode } from "react";
import { pageMetadata } from "../../lib/metadata";

export const metadata = pageMetadata({ title: "社区讨论", description: "围绕财经、产业、政策和企业经营议题，与同行交流并校验判断。", path: "/community" });
export default function CommunityLayout({ children }: { children: ReactNode }) { return children; }
