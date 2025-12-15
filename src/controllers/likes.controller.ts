import type { Request, Response, NextFunction } from 'express';
import Post from '../db/models/Post.model.js';
import Like from '../db/models/Like.model.js';
import Notification from '../db/models/Notification.model.js';
import { Types } from 'mongoose';
import HttpError from '../utils/HttpError.js';

// Інтерфейс для параметрів маршруту
interface PostParams {
    postId: string;
}

/**
 * 🚀 Обробляє створення (лайк) або видалення (дизлайк) лайка.
 * POST /api/posts/:postId/like
 */
export const toggleLike = async (
    req: Request<PostParams>, // Отримуємо postId з параметрів
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.userId; // ID аутентифікованого користувача
        const { postId } = req.params;

        if (!userId) {
            return next(HttpError(401, "Not authenticated."));
        }

        // 1. Перевірка існування поста
        const postObjectId = new Types.ObjectId(postId);
        const post = await Post.findById(postObjectId);
        
        if (!post) {
            return next(HttpError(404, "Post not found."));
        }

        // 2. Шукаємо, чи існує лайк від цього користувача
        const existingLike = await Like.findOne({
            post: postObjectId,
            user: new Types.ObjectId(userId),
        });

        let message = '';
        let status = 200;

        if (existingLike) {
            // ===================================
            // A. Дизлайк (Видалення лайка)
            // ===================================
            await existingLike.deleteOne();
            
            // Зменшуємо лічильник лайків у пості
            post.likesCount = Math.max(0, post.likesCount - 1); // Запобігаємо від'ємним значенням
            await post.save();
            
            message = "Post successfully unliked.";
            status = 200; // 200 OK для успішного видалення
        } else {
            // ===================================
            // B. Лайк (Створення нового лайка)
            // ===================================
            // Створюємо новий запис лайка
            await Like.create({
                post: postObjectId,
                user: new Types.ObjectId(userId),
            });

            // Збільшуємо лічильник лайків у пості
            post.likesCount += 1;
            await post.save();
            
            message = "Post successfully liked.";
            status = 201; // 201 Created для створення

            // 🔥 СТВОРЕННЯ СПОВІЩЕННЯ:
            // Якщо користувач не лайкнув власний пост, створюємо сповіщення
            if (post.author.toString() !== userId) {
                await Notification.create({
                    recipient: post.author, // Автор поста
                    sender: new Types.ObjectId(userId), // Хто лайкнув
                    type: 'like',
                    post: postObjectId,
                });
            }
        }

        // 3. Повертаємо оновлений лічильник (або весь пост)
        res.status(status).json({
            message: message,
            likesCount: post.likesCount,
            isLiked: !existingLike, // Чи є пост зараз лайкнутим
        });
        
    } catch (error) {
        next(error);
    }
};