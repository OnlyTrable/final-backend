// src/routers/posts.router.ts (ОНОВЛЕНО)

import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js'; 
import validateBody from '../middlewares/validateBody.middleware.js'; 
import { createPost, getFeed } from '../controllers/posts.controller.js';
import { toggleLike } from '../controllers/likes.controller.js';
import { createPostSchema } from '../schemas/post.schemas.js';
import multer from 'multer'; 
import mongoose from 'mongoose';

export const postsRouter: Router = Router();

// ФУНКЦІЯ-КОНФІГУРАТОР, ЯКА ДОДАЄ МІДЛВАР MULTER ПІСЛЯ ТОГО,
// ЯК MONGODB ГАРАНТОВАНО ПІДКЛЮЧЕНИЙ
export const configurePostsRouter = (): Router => {

    postsRouter.get(
        '/',
        authenticate, 
        getFeed
    );

    // POST /api/posts - Створити новий пост (з GridFS)
    postsRouter.post(
        '/',
        authenticate, 
        // upload.single('image'), // 🔥 ВИКОРИСТОВУЄМО ІНІЦІАЛІЗОВАНИЙ `upload`
        validateBody(createPostSchema), 
        createPost
    );
    
    postsRouter.post(
        '/:postId/like', // Використовуємо ':postId' як параметр
        authenticate, 
        (toggleLike as unknown) as RequestHandler// Контролер
    );

    return postsRouter;
};
