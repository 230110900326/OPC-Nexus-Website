export type StoredImage = { key: string; url: string; mimeType: string; size: number };
<<<<<<< HEAD
export const IMAGE_STORAGE = Symbol("IMAGE_STORAGE");
=======

export const IMAGE_STORAGE = Symbol("IMAGE_STORAGE");

>>>>>>> 3d0134c839e19d4666f30bffabc3529ddc66c8bd
export interface ImageStorage {
  put(key: string, data: Buffer, mimeType: string): Promise<string>;
  read(key: string): Promise<{ data: Buffer; mimeType: string } | null>;
}
