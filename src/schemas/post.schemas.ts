// src/schemas/post.schemas.ts

import { z } from 'zod';

// Схема для створення нового поста
export const createPostSchema = z.object({
    // Вміст поста (обов'язковий, до 500 символів)
    content: z
        .string()
        .min(1, "Post content cannot be empty.")
        .max(500, "Post content cannot exceed 500 characters."),
});

export type CreatePostPayload = z.infer<typeof createPostSchema>;