// src/controllers/posts.controller.ts (Фінальна версія)

import type { Request, Response, NextFunction } from 'express';
import Post from '../db/models/Post.model.js';
import type { CreatePostPayload } from '../schemas/post.schemas.js';
import { v2 as cloudinary } from 'cloudinary';
import { Types } from 'mongoose'; // 👈 Імпортуємо Types

/**
 * Створює новий пост для аутентифікованого користувача.
 * POST /api/posts
 */
export const createPost = async (req: Request<{}, {}, CreatePostPayload>, res: Response, next: NextFunction) => {
    try {
        const authorId = req.userId;
        console.log('--- DEBUG: Inside createPost Controller ---');
        console.log('1. Initial req.body:', req.body);
        const { content } = req.body;
        console.log('2. Destructured content:', content);

        if (!authorId) {
            return res.status(401).json({ message: "Not authenticated." });
        }

        // Валідація: не можна створити абсолютно порожній пост
        if (!req.file && (!content || !content.trim())) {
            return res.status(400).json({ message: "Post cannot be empty. Please provide content or an image." });
        }

        // 1. Створюємо об'єкт для нового поста
        const postData: {
            author: Types.ObjectId;
            content?: string;
            imageUrl?: string;
            imagePublicId?: string;
        } = {
            author: new Types.ObjectId(authorId), // ✨ Виправляємо тип
        };

        // Додаємо контент, якщо він є
        if (content) {
            postData.content = content;
        }

        // 2. Якщо є файл, завантажуємо його в Cloudinary
        if (req.file) {
            // Завантажуємо буфер напряму в Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({
                    folder: 'posts', // Опціонально: папка в Cloudinary
                }, (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }).end(req.file.buffer);
            });
            postData.imageUrl = (result as any).secure_url;
            postData.imagePublicId = (result as any).public_id;
        }

        console.log('3. Data before saving to DB:', postData);

        // 3. Створюємо пост в базі даних
        const newPost = await Post.create(postData);

        // 4. Відповідь
        res.status(201).json({
            message: "Post created successfully.",
            post: newPost.toObject(),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Отримує стрічку постів з пагінацією.
 */
export const getFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Агрегація для отримання постів разом з даними автора
        const aggregationPipeline: any[] = [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorInfo',
                },
            },
            { $unwind: '$authorInfo' },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    likesCount: 1,
                    imageUrl: 1, // ✅ Просто повертаємо готовий URL
                    imagePublicId: 1, // Повертаємо для можливих дій на фронтенді
                    createdAt: 1,
                    updatedAt: 1,
                    author: {
                        _id: '$authorInfo._id',
                        username: '$authorInfo.username',
                        fullName: '$authorInfo.fullName',
                        // Можна додати інші поля автора, якщо потрібно
                    },
                },
            },
        ];

        const posts = await Post.aggregate(aggregationPipeline);
        const totalPosts = await Post.countDocuments();

        res.status(200).json({
            message: `Successfully fetched posts for page ${page}.`,
            posts: posts, // ✅ Тепер тут пости з готовими URL зображень
            meta: {
                totalPosts,
                currentPage: page,
                limit: limit,
                totalPages: Math.ceil(totalPosts / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};
