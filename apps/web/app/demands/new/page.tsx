import type { Metadata } from "next";
import { DemandEditor } from "../../../components/demand-editor";
export const metadata: Metadata = { title: "发布需求 | OPC Nexus" };
export default function NewDemandPage() { return <DemandEditor />; }
