// src/db/models/Follow.model.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface FollowDocument extends Document {
    follower: Types.ObjectId; // Хто підписався
    following: Types.ObjectId; // На кого підписалися
}

const FollowSchema = new Schema<FollowDocument>(
    {
        follower: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        following: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Унікальний індекс: один користувач може підписатися лише один раз
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow = model<FollowDocument>('Follow', FollowSchema);
export default Follow;