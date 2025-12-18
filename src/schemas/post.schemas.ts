// src/schemas/post.schemas.ts

import { z } from 'zod';

// Схема для створення нового поста
export const createPostSchema = z.object({
    // Вміст поста (обов'язковий, до 500 символів)
    // Робимо його необов'язковим, оскільки може бути лише зображення
    content: z
        .string()
        .max(500, "Post content cannot exceed 500 characters.")
        .optional(),
});

export type CreatePostPayload = z.infer<typeof createPostSchema>;