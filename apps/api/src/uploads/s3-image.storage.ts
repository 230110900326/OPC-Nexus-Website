import { ConfigService } from "@nestjs/config";
import { createHash, createHmac } from "node:crypto";
import { BadGatewayException } from "@nestjs/common";
import { ImageStorage } from "./image-storage.interface";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const hmac = (key: string | Buffer, value: string) => createHmac("sha256", key).update(value).digest();
export class S3ImageStorage implements ImageStorage {
  constructor(private readonly config: ConfigService) {}
  async put(key: string, data: Buffer, mimeType: string): Promise<string> {
    const endpoint = this.config.getOrThrow<string>("S3_ENDPOINT").replace(/\/$/, "");
    const bucket = this.config.getOrThrow<string>("S3_BUCKET");
    const region = this.config.get<string>("S3_REGION", "auto");
    const url = new URL(`${endpoint}/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`);
    const now = new Date(); const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); const date = amzDate.slice(0, 8); const payloadHash = hash(data);
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
    const canonicalHeaders = `content-type:${mimeType}\nhost:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const canonicalRequest = `PUT\n${url.pathname}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const scope = `${date}/${region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${hash(canonicalRequest)}`;
    const secret = this.config.getOrThrow<string>("S3_SECRET_ACCESS_KEY");
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), "s3"), "aws4_request");
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const credential = this.config.getOrThrow<string>("S3_ACCESS_KEY_ID");
    const response = await fetch(url, { method: "PUT", headers: { "Content-Type": mimeType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, Authorization: `AWS4-HMAC-SHA256 Credential=${credential}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` }, body: new Blob([new Uint8Array(data)], { type: mimeType }) });
    if (!response.ok) throw new BadGatewayException("对象存储上传失败");
    return `${this.config.get<string>("S3_PUBLIC_BASE_URL", `${endpoint}/${bucket}`).replace(/\/$/, "")}/${key}`;
  }
  async read() { return null; }
}
