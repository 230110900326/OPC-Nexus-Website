import { BadRequestException } from "@nestjs/common";
import { ImageStorage } from "./image-storage.interface";
import { UploadsService } from "./uploads.service";

describe("UploadsService", () => {
  const storage: jest.Mocked<ImageStorage> = { put: jest.fn().mockResolvedValue("http://localhost:4000/uploads/image.png"), read: jest.fn() };
  const service = new UploadsService(storage);

  beforeEach(() => jest.clearAllMocks());

  it("accepts a PNG only when its binary signature is valid", async () => {
    const buffer = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16)]);
    const result = await service.upload({ buffer, mimetype: "image/png", size: buffer.length });
    expect(result.key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(storage.put).toHaveBeenCalledWith(result.key, buffer, "image/png");
  });

  it("rejects a file whose MIME type does not match its bytes", async () => {
    await expect(service.upload({ buffer: Buffer.from("not-an-image"), mimetype: "image/png", size: 12 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects files larger than 5MB", async () => {
    await expect(service.upload({ buffer: Buffer.alloc(12), mimetype: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires a file", async () => {
    await expect(service.upload()).rejects.toBeInstanceOf(BadRequestException);
  });
});
