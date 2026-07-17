import type { Metadata } from "next";
import { SearchPage } from "../../components/search-page";
import { SiteChrome } from "../../components/site-chrome";

export const metadata: Metadata = {
  title: "全站搜索 | OPC Nexus",
  description: "检索 OPC Nexus 的文章、社区帖子与视频内容。",
};

export default function SearchRoute() { return <SiteChrome><SearchPage /></SiteChrome>; }
