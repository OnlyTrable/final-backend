// src/schemas/comment.schemas.ts

import { z } from 'zod';

const COMMENT_MAX_LENGTH = 250; 

export const createCommentSchema = z.object({
    // Зроблено необов'язковим у Zod, оскільки Multer обробляє зображення окремо.
    // Mongoose хук 'validate' перевірить, чи є АБО content, АБО imageUrl.
    content: z
        .string()
        .max(COMMENT_MAX_LENGTH, `Comment content cannot exceed ${COMMENT_MAX_LENGTH} characters.`)
        .optional(), // ✅ Зроблено опціональним!
});

export type CreateCommentPayload = z.infer<typeof createCommentSchema>;