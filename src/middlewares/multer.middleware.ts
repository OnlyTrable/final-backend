// src/middlewares/multer.middleware.ts

import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import HttpError from '../utils/HttpError.js';
import type { Request, Response, NextFunction } from 'express';

// 1. КОНФІГУРАЦІЯ CLOUDINARY
// Автоматично зчитує CLOUDINARY_URL зі змінних оточення.
cloudinary.config(); 

// 2. ІНІЦІАЛІЗАЦІЯ MULTER (memoryStorage)
// Файл тимчасово зберігається в пам'яті (Buffer)
const storage = multer.memoryStorage();

// ФІЛЬТР ФАЙЛІВ (дозволяємо лише зображення)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(HttpError(400, 'Invalid file type. Only image files are allowed.'));
    }
};

export const multerUpload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 1024 * 1024 * 5 // Обмеження 5MB
    },
    fileFilter: fileFilter,
});

// 3. МІДЛВАР ДЛЯ ЗАВАНТАЖЕННЯ НА CLOUDINARY
export const cloudinaryUpload = async (
    req: Request, 
    res: Response, 
    next: NextFunction
) => {
    // Якщо файл не завантажено (немає зображення), просто продовжуємо
    if (!req.file) {
        return next();
    }

    try {
        // Конвертуємо буфер файлу у base64 data URI для завантаження
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        
        // Завантаження файлу на Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'social-app-images/comments', // Спеціальна папка
            resource_type: 'image',
        });
        
        // Зберігаємо URL (path) та Public ID (filename) у req.file
        (req.file as any).path = result.secure_url;    // URL зображення
        (req.file as any).filename = result.public_id;  // Public ID

        next();

    } catch (error) {
        // Якщо завантаження на Cloudinary не вдалося
        next(HttpError(500, "Image upload failed."));
    }
};