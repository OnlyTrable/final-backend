// src/routers/posts.router.ts

import { Router } from 'express';
import type { RequestHandler } from 'express';
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

export const configurePostsRouter = (): Router => {
    postsRouter.get(
        '/',
        authenticate, 
        getFeed
    );

    postsRouter.post(
        '/',
        authenticate, 
        // Припускаємо, що роут для постів використовує окремий Multer, або цей
        // upload.single('image'), 
        validateBody(createPostSchema), 
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