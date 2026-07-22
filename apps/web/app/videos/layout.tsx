import type { ReactNode } from "react";
import { pageMetadata } from "../../lib/metadata";

export const metadata = pageMetadata({ title: "视频洞察", description: "浏览已授权视频资料与基于合法字幕生成的内容概要。", path: "/videos" });
export default function VideosLayout({ children }: { children: ReactNode }) { return children; }
