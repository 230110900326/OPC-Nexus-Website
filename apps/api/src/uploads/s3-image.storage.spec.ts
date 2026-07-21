import { ConfigService } from "@nestjs/config";
import { S3ImageStorage } from "./s3-image.storage";

describe("S3ImageStorage", () => {
  const values: Record<string, string> = { S3_ENDPOINT: "https://s3.example.com", S3_BUCKET: "opc-assets", S3_REGION: "auto", S3_ACCESS_KEY_ID: "test-access", S3_SECRET_ACCESS_KEY: "test-secret", S3_PUBLIC_BASE_URL: "https://cdn.example.com" };
  const config = { getOrThrow: jest.fn((key: string) => values[key]), get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback) } as unknown as ConfigService;
  const originalFetch = global.fetch;

  afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks(); });

  it("signs a PUT request and returns the configured public URL", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    const storage = new S3ImageStorage(config);
    const url = await storage.put("11111111-1111-4111-8111-111111111111.png", Buffer.from("image"), "image/png");
    expect(url).toBe("https://cdn.example.com/11111111-1111-4111-8111-111111111111.png");
    const request = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(request[0])).toContain("opc-assets");
    expect(request[1].headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 /);
  });
});
