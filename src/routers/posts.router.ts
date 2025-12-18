// src/routers/posts.router.ts

import { Router } from 'express';
import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js'; 
import validateBody from '../middlewares/validateBody.middleware.js'; 
import { createPost, getFeed } from '../controllers/posts.controller.js';
import { toggleLike } from '../controllers/likes.controller.js';
import { createPostSchema } from '../schemas/post.schemas.js';
import multer from 'multer'; 
import mongoose from 'mongoose';
// 🔥 ІМПОРТИ ДЛЯ КОМЕНТАРІВ
import { createComment } from '../controllers/comments.controller.js';
import { createCommentSchema } from '../schemas/comment.schemas.js';
import { multerUpload, cloudinaryUpload } from '../middlewares/multer.middleware.js'; 


export const postsRouter: Router = Router();

// // Створимо простий middleware для логування (можна видалити або закоментувати)
// const logRequestData: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
//     console.log('--- DEBUG: Request Data ---');
//     console.log('req.body:', req.body);
//     console.log('req.file:', req.file ? { fieldname: req.file.fieldname, originalname: req.file.originalname, size: req.file.size } : 'No file');
//     next();
// };

export const configurePostsRouter = (): Router => {
    postsRouter.get(
        '/',
        authenticate, 
        getFeed
    );

    postsRouter.post(
        '/',
        authenticate, // 1. Спочатку перевіряємо, чи авторизований користувач
        // 2. Тепер обробляємо файл
        multerUpload.single('image'), 
        cloudinaryUpload, 
        // logRequestData, // Прибираємо логер
        // validateBody(createPostSchema), // ❌ ВИДАЛЕНО: Цей middleware конфліктує з multer для multipart/form-data.
        createPost
    );
    
    postsRouter.post(
        '/:postId/like', 
        authenticate, 
        (toggleLike as unknown) as RequestHandler
    );

    // 🔥 НОВИЙ РОУТ ДЛЯ КОМЕНТАРІВ ІЗ ЗОБРАЖЕННЯМИ
    postsRouter.post(
        '/:postId/comments', 
        authenticate, 
        multerUpload.single('image'), 
        cloudinaryUpload, 
        validateBody(createCommentSchema), 
        (createComment as unknown) as RequestHandler
    );

    return postsRouter;
};