import type { Metadata } from "next";
import { DemandDetail } from "../../../components/demand-detail";
import { SiteChrome } from "../../../components/site-chrome";
export const metadata: Metadata = { title: "需求详情 | OPC Nexus" };
export default function DemandDetailPage() { return <SiteChrome><DemandDetail /></SiteChrome>; }
