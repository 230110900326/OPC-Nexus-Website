import type { Metadata } from "next";
import { DemandDetail } from "../../../components/demand-detail";
import { SiteHeader } from "../../../components/site-header";
export const metadata: Metadata = { title: "需求详情 | OPC Nexus" };
export default function DemandDetailPage() { return <><SiteHeader /><DemandDetail /></>; }
