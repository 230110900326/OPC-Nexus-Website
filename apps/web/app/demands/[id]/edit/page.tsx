import type { Metadata } from "next";
import { DemandEditor } from "../../../../components/demand-editor";
export const metadata: Metadata = { title: "编辑需求 | OPC Nexus" };
export default function EditDemandPage() { return <DemandEditor edit />; }
