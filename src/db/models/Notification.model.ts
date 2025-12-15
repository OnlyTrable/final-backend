import { Schema, model, Document, Types } from 'mongoose';

// Типи подій для сповіщень
export type NotificationType = 'like' | 'comment' | 'follow';

// Інтерфейс для документа Notification
export interface NotificationDocument extends Document {
    recipient: Types.ObjectId; // Користувач, який отримує сповіщення
    sender: Types.ObjectId;    // Користувач, який викликав подію
    type: NotificationType;    // Тип події ('like', 'comment', 'follow')
    
    // Посилання на пов'язаний контент:
    post?: Types.ObjectId;     // Для лайків/коментарів
    comment?: Types.ObjectId;  // Для коментарів
    
    isRead: boolean;           // Чи прочитано сповіщення
}

const NotificationSchema = new Schema<NotificationDocument>(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true, // Індекс для швидкого пошуку сповіщень для користувача
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['like', 'comment', 'follow'], // Обмеження типу
            required: true,
        },
        post: {
            type: Schema.Types.ObjectId,
            ref: 'Post',
            required: false,
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: 'Comment',
            required: false,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Сортування за часом
NotificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = model<NotificationDocument>('Notification', NotificationSchema);
export default Notification;