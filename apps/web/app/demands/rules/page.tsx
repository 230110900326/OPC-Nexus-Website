import type { Metadata } from "next";
import { DemandRules } from "../../../components/demand-rules";
import { SiteChrome } from "../../../components/site-chrome";
export const metadata: Metadata = { title: "需求广场服务规范 | OPC Nexus" };
export default function DemandRulesPage() { return <SiteChrome><DemandRules /></SiteChrome>; }
