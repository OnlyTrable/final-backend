import { Schema, model, Document, Types } from 'mongoose';

// Інтерфейс для документа Message
export interface MessageDocument extends Document {
    conversation: Types.ObjectId; // ID розмови, до якої належить повідомлення
    sender: Types.ObjectId; // ID користувача, який надіслав повідомлення
    content: string; // Вміст повідомлення
    isRead: boolean; // Чи прочитано повідомлення (актуально для приватних чатів)
    // Можна додати підтримку зображень, якщо потрібно
}

const MessageSchema = new Schema<MessageDocument>(
    {
        conversation: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
            maxlength: 1000,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true, // `createdAt` - коли повідомлення було надіслано
        versionKey: false,
    }
);

// Створюємо індекс для швидкого пошуку повідомлень у розмові та сортування за часом
MessageSchema.index({ conversation: 1, createdAt: -1 }); 

const Message = model<MessageDocument>('Message', MessageSchema);
export default Message;