// src/db/models/Post.model.ts (Фінальна версія)

import { Schema, model, Document, Types } from 'mongoose';

// 1. Інтерфейс для документа Post
export interface PostDocument extends Document {
    author: Types.ObjectId;
    content?: string; // Може бути відсутнім, якщо є imageUrl
    likesCount?: number; // Має значення за замовчуванням
    commentsCount?: number; // Має значення за замовчуванням
    imageUrl?: string; // URL зображення з Cloudinary
    imagePublicId?: string; // Public ID зображення з Cloudinary для видалення
}

// 2. Схема Mongoose
const PostSchema = new Schema<PostDocument>(
    {
        author: { 
            type: Schema.Types.ObjectId, 
            ref: 'User',
            required: true 
        },
        content: { 
            type: String, 
            // Поле не є строго обов'язковим, оскільки може бути пост лише з зображенням.
            // Але якщо воно є, то не може бути порожнім після trim.
            required: function(this: PostDocument) {
                return !this.imageUrl; // Контент обов'язковий, якщо НЕМАЄ зображення
            },
            trim: true,
            // minlength: [0, '...'] є недійсним. Прибираємо його, оскільки логіка required вже достатня.
            maxlength: 500,
        },
        likesCount: { 
            type: Number, 
            default: 0, 
        },
        commentsCount: { 
            type: Number, 
            default: 0,
        },
        imageUrl: { // Зберігає URL зображення
            type: String,
            required: false, // Робимо поле необов'язковим
        },
        imagePublicId: { // Зберігає public_id для керування файлом
            type: String,
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

const Post = model<PostDocument>('Post', PostSchema);
export default Post;