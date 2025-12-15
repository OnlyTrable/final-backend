import { z } from 'zod';

export const createMessageSchema = z.object({
    recipientId: z
        .string()
        .min(1, "Recipient ID is required.")
        .regex(/^[0-9a-fA-F]{24}$/, "Recipient ID must be a valid MongoDB ObjectId."),
        
    content: z
        .string()
        .min(1, "Message content cannot be empty.")
        .max(1000, "Message content cannot exceed 1000 characters."),
});

export type CreateMessagePayload = z.infer<typeof createMessageSchema>;