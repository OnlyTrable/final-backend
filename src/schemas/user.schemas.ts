// src/schemas/user.schemas.ts

import { z } from 'zod';

// 🔥 Схема для оновлення профілю
export const updateProfileSchema = z.object({
    // Username (4+ символів, опціонально)
    username: z
        .string()
        .min(4, "Username must be at least 4 characters long")
        .optional(), 

    // FullName (опціонально)
    fullName: z
        .string()
        .min(1, "Full Name is required")
        .optional(),

    // Website (опціонально)
    website: z
        .string()
        .max(255, "Website URL is too long")
        .optional(),

    // About (Біографія, обмеження 150 символів, згідно з референсом)
    about: z
        .string()
        .max(150, "Bio cannot exceed 150 characters") 
        .optional(),
}).strict().refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update.",
    path: ["body"],
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;