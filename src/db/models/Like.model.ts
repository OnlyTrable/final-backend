// src/db/models/Like.model.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface LikeDocument extends Document {
    post: Types.ObjectId;
    user: Types.ObjectId;
}

const LikeSchema = new Schema<LikeDocument>(
    {
        post: {
            type: Schema.Types.ObjectId,
            ref: 'Post',
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true, // Дата лайку
        versionKey: false,
    }
);

// Унікальний індекс: один користувач може лайкнути один пост лише один раз
LikeSchema.index({ post: 1, user: 1 }, { unique: true });

const Like = model<LikeDocument>('Like', LikeSchema);
export default Like;