// src/controllers/posts.controller.ts (Фінальна версія)

import type { Request, Response, NextFunction } from 'express';
import Post from '../db/models/Post.model.js'; 
import type { CreatePostPayload } from '../schemas/post.schemas.js';
import mongoose from 'mongoose'; // 🔥 Потрібен тут для GridFS

/**
 * Створює новий пост для аутентифікованого користувача.
 * POST /api/posts
 */
export const createPost = async (req: Request<{}, {}, CreatePostPayload>, res: Response, next: NextFunction) => {
    try {
        const authorId = req.userId; 
        const { content } = req.body; 
        
        // 🔥 Отримуємо ID файлу GridFS
        // Тип req.file тепер коректно визначений завдяки multer.d.ts
        const imageId = req.file?.id as mongoose.Types.ObjectId | undefined;

        if (!authorId) {
            return res.status(401).json({ message: "Not authenticated." });
        }

        // 1. Створюємо явно типізований об'єкт
        const postData: {
            author: string; 
            content: string;
            imageUrl?: mongoose.Types.ObjectId; // Використовуємо optional property
        } = {
            author: authorId,
            content: content,
        };
        // 2. 🔥 УМОВНО ДОДАЄМО imageUrl: 
        // Це гарантує, що якщо imageId === undefined, то поле 'imageUrl' 
        // буде ВІДСУТНЄ в об'єкті postData, що задовольняє `exactOptionalPropertyTypes: true`.
        if (imageId) {
             postData.imageUrl = imageId;
        }
        // 2. Викликаємо create, передаючи типізовану змінну
        const newPost = (await Post.create(postData) as any);

        // 3. 🔥 ФІНАЛЬНА ПЕРЕВІРКА: Гарантуємо, що newPost існує, перш ніж викликати toObject()
        if (!newPost) {
            // Це захист від малоймовірного сценарію, коли create не повертає документ
            return res.status(500).json({ message: "Post creation failed unexpectedly. Document not returned." }); 
        }

        // 2. Відповідь
        res.status(201).json({
            message: "Post created successfully.",
            post: newPost.toObject(),
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Отримує стрічку постів з пагінацією (Aggregation).
 */
export const getFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // ... (логіка пагінації) ...
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const aggregationPipeline: any[] = [ 
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },

            // $lookup для автора
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorDetails',
                },
            },
            { $unwind: '$authorDetails' },
            {
                $project: {
                    _id: 1, 
                    content: 1,
                    likesCount: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    imageUrl: 1, // 🔥 ПОВЕРТАЄМО ID ЗОБРАЖЕННЯ
                    author: {
                        _id: '$authorDetails._id',
                        username: '$authorDetails.username',
                        fullName: '$authorDetails.fullName',
                        website: '$authorDetails.website',
                        about: '$authorDetails.about',
                    },
                },
            },
        ];

        const posts = await Post.aggregate(aggregationPipeline);

        const totalPosts = await Post.countDocuments();
        
        // 🔥 НОВИЙ БЛОК: Трансформація ID зображення в URL
        const postsWithUrls = posts.map(post => {
            // Створюємо повний URL, використовуючи наш маршрут getImage
            const imageUrl = post.imageUrl 
                ? `/api/posts/image/${post.imageUrl}` 
                : null; 
            
            // Повертаємо новий об'єкт
            return {
                ...post,
                imageUrl: imageUrl, // Замінюємо ObjectId на URL або null
            };
        });

        res.status(200).json({
            message: `Successfully fetched posts for page ${page} (Final).`,
            posts: postsWithUrls, // ✅ ВИКОРИСТОВУЄМО ТРАНСФОРМОВАНІ ПОСТИ
            meta: {
                totalPosts,
                currentPage: page,
                limit: limit,
                totalPages: Math.ceil(totalPosts / limit),
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Отримує зображення з GridFS за його ID.
 * GET /api/posts/image/:fileId
 */
export const getImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fileId = req.params.fileId;
        
        // 1. Валідація ID
        if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(404).json({ message: "Invalid or missing file ID." });
        }

        const db = mongoose.connection.db;
        
        // 🔥 ВИПРАВЛЕННЯ: Перевіряємо, чи існує db
        if (!db) {
             // Цей код ніколи не має бути досягнутий у Вашому випадку, але це захист
             console.error("MongoDB DB object is not available.");
             return res.status(500).json({ message: "Database connection object is missing." });
        }

        // 2. Ініціалізація GridFSBucket
        // Вказуємо ту саму назву кошика ('postImages'), що й у Multer
        const gfs = new mongoose.mongo.GridFSBucket(db, { bucketName: 'postImages' });
        
        const objectId = new mongoose.Types.ObjectId(fileId);
        
        // 3. Пошук файлу для отримання метаданих (особливо MIME-типу)
        const file = await gfs.find({ _id: objectId }).toArray();
        
        if (!file || file.length === 0 || !file[0]) {
            return res.status(404).json({ message: "File not found in GridFS." });
        }

        const fileMetadata = file[0];
        // Визначаємо MIME-тип
        const mimeType = (fileMetadata as any).contentType || 'application/octet-stream';
        
        // 4. Встановлення заголовка Content-Type
        res.set('Content-Type', mimeType);
        
        // 5. Відкриття потоку завантаження та перенаправлення його у відповідь
        const readstream = gfs.openDownloadStream(objectId);
        
        readstream.on('error', (err) => {
            console.error("Error streaming file:", err);
            res.status(500).json({ message: "Error retrieving file." });
        });
        
        readstream.pipe(res);

    } catch (error) {
        next(error);
    }
};