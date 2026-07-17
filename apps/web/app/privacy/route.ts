import { legalDocumentResponse } from "../../lib/legal-document";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return legalDocumentResponse("privacy.html", "隐私政策");
}
