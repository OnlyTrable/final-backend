import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import HttpError from './HttpError.js';

/**
 * Завантажує буфер файлу на Cloudinary.
 * @param buffer - Буфер файлу для завантаження.
 * @param folder - Папка на Cloudinary для збереження файлу.
 * @returns Проміс, що повертає результат завантаження від Cloudinary.
 */
export const uploadToCloudinary = (
    buffer: Buffer,
    folder: string,
): Promise<UploadApiResponse> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) {
                    // Створюємо більш інформативну помилку
                    return reject(HttpError(500, `Cloudinary upload failed: ${error.message}`));
                }
                if (!result) {
                    return reject(HttpError(500, "Cloudinary upload failed: no result returned."));
                }
                resolve(result);
            },
        );
        Readable.from(buffer).pipe(uploadStream);
    });
};