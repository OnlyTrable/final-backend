// src/routers/posts.router.ts (ОНОВЛЕНО)

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js'; 
import validateBody from '../middlewares/validateBody.middleware.js'; 
import { createPost, getFeed, getImage } from '../controllers/posts.controller.js'; 
import { createPostSchema } from '../schemas/post.schemas.js';
import multer from 'multer'; 
import { GridFsStorage } from '@lenne.tech/multer-gridfs-storage'; 
import mongoose from 'mongoose'; // <-- ЗАЛИШАЄМО

// 🔥 МИ ПЕРЕНОСИМО ЛОГІКУ ІНІЦІАЛІЗАЦІЇ MULTER УСЕРЕДИНУ ФУНКЦІЇ!

export const postsRouter: Router = Router();

// ФУНКЦІЯ-КОНФІГУРАТОР, ЯКА ДОДАЄ МІДЛВАР MULTER ПІСЛЯ ТОГО,
// ЯК MONGODB ГАРАНТОВАНО ПІДКЛЮЧЕНИЙ
export const configurePostsRouter = (): Router => {
    
    // 1. КОНФІГУРАЦІЯ GRIDFS/MULTER (Ініціалізується при виклику configurePostsRouter)
    
    const storage = new GridFsStorage({
        // ✅ ВИКОРИСТОВУЄМО ТЕ, ЩО ГАРАНТОВАНО БУДЕ ІСНУВАТИ
        db: mongoose.connection.db as any, 
        
        file: (req, file) => {
            const filename = `${file.fieldname}-${Date.now()}-${file.originalname}`;
            return {
                bucketName: 'postImages', 
                filename: filename,
            };
        },
    });

    const upload = multer({ 
        storage: storage as any, 
        limits: { fileSize: 6 * 1024 * 1024 } 
    });

    // 2. РЕЄСТРАЦІЯ МАРШРУТІВ
    
    // GET /api/posts
    postsRouter.get(
        '/',
        authenticate, 
        getFeed
    );

    // POST /api/posts - Створити новий пост (з GridFS)
    postsRouter.post(
        '/',
        authenticate, 
        upload.single('image'), // 🔥 ВИКОРИСТОВУЄМО ІНІЦІАЛІЗОВАНИЙ `upload`
        validateBody(createPostSchema), 
        createPost
    );

    // GET /api/posts/image/:fileId - Роздача зображень
    postsRouter.get(
        '/image/:fileId',
        getImage 
    );
    
    return postsRouter;
};

// Експортуємо лише postsRouter, але завантажуємо його через configurePostsRouter

// export default postsRouter; // Більше не експортуємо так