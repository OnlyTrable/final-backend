// src/db/models/Block.model.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface BlockDocument extends Document {
    user: Types.ObjectId; // Користувач, який виконує дію (наприклад, блокує)
    targetUser: Types.ObjectId; // Користувач, який заблокований/замутований
    type: 'Block' | 'Mute' | 'Report'; // Тип дії
    reason?: string; // Причина дії
}

const BlockSchema = new Schema<BlockDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        targetUser: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['Block', 'Mute', 'Report'],
            required: true,
        },
        reason: {
            type: String,
            maxlength: 500,
        }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Унікальний індекс на пару (user, targetUser, type) для запобігання дублікатам
BlockSchema.index({ user: 1, targetUser: 1, type: 1 }, { unique: true });

const Block = model<BlockDocument>('Block', BlockSchema);
export default Block;