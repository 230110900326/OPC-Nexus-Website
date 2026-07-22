import { ConfigService } from "@nestjs/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { ImageStorage } from "./image-storage.interface";

const mimeByExtension: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
<<<<<<< HEAD
export class LocalImageStorage implements ImageStorage {
  private readonly root: string;
  constructor(private readonly config: ConfigService) { this.root = resolve(config.get("UPLOAD_DIR", "uploads")); }
  async put(key: string, data: Buffer): Promise<string> { await mkdir(this.root, { recursive: true }); await writeFile(resolve(this.root, key), data, { flag: "wx" }); return `${this.config.get("API_PUBLIC_URL", "http://localhost:4000")}/uploads/${key}`; }
  async read(key: string) { if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(key)) return null; try { return { data: await readFile(resolve(this.root, key)), mimeType: mimeByExtension[extname(key)] }; } catch { return null; } }
=======

export class LocalImageStorage implements ImageStorage {
  private readonly root: string;

  constructor(private readonly config: ConfigService) {
    this.root = resolve(config.get("UPLOAD_DIR", "uploads"));
  }

  async put(key: string, data: Buffer): Promise<string> {
    await mkdir(this.root, { recursive: true });
    await writeFile(resolve(this.root, key), data, { flag: "wx" });
    return `${this.config.get("API_PUBLIC_URL", "http://localhost:4000")}/uploads/${key}`;
  }

  async read(key: string) {
    if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(key)) return null;
    try {
      return { data: await readFile(resolve(this.root, key)), mimeType: mimeByExtension[extname(key)] };
    } catch {
      return null;
    }
  }
>>>>>>> 3d0134c839e19d4666f30bffabc3529ddc66c8bd
}
