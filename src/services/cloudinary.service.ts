// src/services/cloudinary.service.ts

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";

/**
 * Завантажує буфер зображення на Cloudinary.
 * @param buffer - Буфер файлу зображення.
 * @param options - Опції для завантаження на Cloudinary (наприклад, папка, трансформації).
 * @returns Проміс, що повертає результат завантаження.
 */
export const uploadImageStream = (
  buffer: Buffer,
  options: object,
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result: UploadApiResponse | undefined) => {
        if (result) {
          resolve(result);
        } else if (error) {
          reject(error);
        } else {
          reject(new Error("Cloudinary upload failed to return a result."));
        }
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Видаляє зображення з Cloudinary за його public_id.
 * @param publicId - Public ID зображення на Cloudinary.
 * @returns Проміс, що повертає результат видалення.
 */
export const deleteImage = (publicId: string) => {
  return cloudinary.uploader.destroy(publicId);
};