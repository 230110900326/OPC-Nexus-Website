export type StoredImage = { key: string; url: string; mimeType: string; size: number };

export const IMAGE_STORAGE = Symbol("IMAGE_STORAGE");

export interface ImageStorage {
  put(key: string, data: Buffer, mimeType: string): Promise<string>;
  read(key: string): Promise<{ data: Buffer; mimeType: string } | null>;
}
