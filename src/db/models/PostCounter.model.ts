import { Schema, model, Document } from 'mongoose';

// Інтерфейс для документа лічильника
export interface PostCounterDocument extends Document {
  totalPosts: number;
}

// Схема для зберігання єдиного документа з загальною кількістю постів
const postCounterSchema = new Schema<PostCounterDocument>({
  totalPosts: {
    type: Number,
    required: true,
    default: 0,
  },
}, {
  // Важливо: відключаємо timestamp, бо нам потрібна лише одна сутність
  timestamps: false, 
  versionKey: false,
});

// Створення моделі. Ця модель буде використовуватися для health check.
const PostCounter = model<PostCounterDocument>('PostCounter', postCounterSchema);

export default PostCounter;