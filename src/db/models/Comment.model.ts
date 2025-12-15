import { Schema, model, Document, Types } from 'mongoose';

// Інтерфейс для документа Comment
export interface CommentDocument extends Document {
    post: Types.ObjectId; // ID поста, до якого відноситься коментар
    author: Types.ObjectId; // ID користувача, який залишив коментар
    content?: string; // Текст коментаря
    imageUrl?: string; 
    imagePublicId?: string;
}

const CommentSchema = new Schema<CommentDocument>(
    {
        post: {
            type: Schema.Types.ObjectId,
            ref: 'Post',
            required: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: false,
            maxlength: 250, // Обмеження довжини коментаря
            trim: true,
        },
        imageUrl: {
            type: String,
            required: false,
        },
        imagePublicId: {
            type: String,
            required: false,
        },
    },
    {
        timestamps: true, // Дата створення
        versionKey: false,
    }
);

// Важливо: Додаємо валідатор, який вимагає наявності АБО тексту, АБО зображення.
(CommentSchema.pre as any)('validate', function(this: CommentDocument, next: (err?: any) => void) { 
    
    // Внутрішня логіка залишається суворо типізованою завдяки `this: CommentDocument`!
    if (!this.content && !this.imageUrl) {
        this.invalidate('content', 'A comment must contain either text content or an image.', this.content);
    }
    
    next(); 
});
// Створюємо індекс для швидкого пошуку коментарів до певного поста
CommentSchema.index({ post: 1, createdAt: 1 });

const Comment = model<CommentDocument>('Comment', CommentSchema);
export default Comment;