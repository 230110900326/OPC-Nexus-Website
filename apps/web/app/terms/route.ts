import { legalDocumentResponse } from "../../lib/legal-document";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return legalDocumentResponse("premise.html", "用户服务协议");
}
