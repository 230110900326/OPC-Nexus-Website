import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { IMAGE_STORAGE, ImageStorage, StoredImage } from "./image-storage.interface";

export type UploadedImageFile = { buffer: Buffer; mimetype: string; size: number };
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
@Injectable()
export class UploadsService {
  constructor(@Inject(IMAGE_STORAGE) private readonly storage: ImageStorage) {}
  async upload(file?: UploadedImageFile): Promise<StoredImage> {
    if (!file) throw new BadRequestException("请选择图片文件");
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException("图片不能超过 5MB");
    const extension = extensions[file.mimetype];
    if (!extension || !this.matchesSignature(file.buffer, file.mimetype)) throw new BadRequestException("仅支持真实的 JPG、PNG 或 WebP 图片");
    const key = `${randomUUID()}.${extension}`;
    return { key, url: await this.storage.put(key, file.buffer, file.mimetype), mimeType: file.mimetype, size: file.size };
  }
  read(key: string) { return this.storage.read(key); }
  private matchesSignature(data: Buffer, mimeType: string) { if (mimeType === "image/jpeg") return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff; if (mimeType === "image/png") return data.length > 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])); return data.length > 12 && data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP"; }
}
