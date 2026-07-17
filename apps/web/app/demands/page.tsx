import type { Metadata } from "next";
import { DemandMarketplace } from "../../components/demand-marketplace";
import { SiteChrome } from "../../components/site-chrome";
export const metadata: Metadata = { title: "OPC 需求广场 | OPC Nexus", description: "面向 OPC 从业者的财经、产业调研、数据、报告与项目咨询供需撮合板块。" };
export default function DemandsPage() { return <SiteChrome><DemandMarketplace /></SiteChrome>; }
