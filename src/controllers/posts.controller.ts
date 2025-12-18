// src/controllers/posts.controller.ts (Фінальна версія)

import type { Request, Response, NextFunction } from 'express';
import Post from '../db/models/Post.model.js';
import type { CreatePostPayload } from '../schemas/post.schemas.js';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { Types } from 'mongoose'; // 👈 Імпортуємо Types
import { uploadToCloudinary } from '../utils/cloudinaryUploader.js';

/**
 * Створює новий пост для аутентифікованого користувача.
 * POST /api/posts
 */
export const createPost = async (req: Request<{}, {}, CreatePostPayload>, res: Response, next: NextFunction) => {
    try {
        const authorId = req.userId;
        // console.log('\n--- 🚀 DEBUG: Inside createPost Controller ---');
        // console.log('1. Authenticated User ID (from token):', authorId);
        // console.log('2. Initial req.body (text fields):', req.body);
        const { content } = req.body;
        // console.log('3. Destructured content:', content);

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
            // console.log('4. File detected. Uploading to Cloudinary. File info:', {
            //     fieldname: req.file.fieldname,
            //     originalname: req.file.originalname,
            //     mimetype: req.file.mimetype,
            //     size: req.file.size,
            // });
            const result = await uploadToCloudinary(req.file.buffer, 'posts');
            // console.log('5. Cloudinary upload result:', result);
            postData.imageUrl = result.secure_url;
            postData.imagePublicId = result.public_id;
        }

        // console.log('6. Final data object before saving to DB:', postData);

        // 3. Створюємо пост в базі даних
        const newPost = await Post.create(postData);
        // console.log('7. Post successfully created in DB. ID:', newPost._id);

        // 4. Відповідь клієнту
        res.status(201).json({ message: "Post created successfully.", post: newPost.toObject() });
    } catch (error) {
        // console.error('--- ❌ ERROR in createPost Controller ---', error);
        next(error);
    }
};

/**
 * Отримує стрічку постів з пагінацією.
 */
export const getFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId; // Отримуємо ID поточного користувача
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
            // === ✨ ДОДАЄМО ІНФОРМАЦІЮ ПРО ЛАЙК ПОТОЧНОГО КОРИСТУВАЧА ===
            {
                $lookup: {
                    from: 'likes',
                    let: { postId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $and: [{ $eq: ['$post', '$$postId'] }, { $eq: ['$user', new Types.ObjectId(userId)] }] },
                            },
                        },
                    ],
                    as: 'userLike',
                },
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    likesCount: 1,
                    imageUrl: 1, // ✅ Просто повертаємо готовий URL
                    imagePublicId: 1, // Повертаємо для можливих дій на фронтенді
                    createdAt: 1,
                    updatedAt: 1,
                    isLiked: { $gt: [{ $size: '$userLike' }, 0] }, // true, якщо масив userLike не порожній
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
