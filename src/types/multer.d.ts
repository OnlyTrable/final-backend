// src/types/multer.d.ts

import { GridFSFile } from 'mongodb'; // Імпортуємо тип файлу GridFS з нативної бібліотеки MongoDB

declare global {
    namespace Express {
        namespace Multer {
            // Розширюємо існуючий тип File, який використовує Multer
            interface File extends Partial<GridFSFile> {
                // Властивості, які додає multer-gridfs-storage
                id?: import('mongoose').Types.ObjectId;
                filename?: string;
                metadata?: Record<string, any>;
                bucketName?: string;
                uploadDate?: Date;
                length?: number;
                chunkSize?: number;
                contentType?: string;
            }
        }
    }
}