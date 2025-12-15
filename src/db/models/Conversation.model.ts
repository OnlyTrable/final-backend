import { Schema, model, Document, Types } from 'mongoose';

// Інтерфейс для документа Conversation
export interface ConversationDocument extends Document {
    participants: Types.ObjectId[]; // Масив ID користувачів
    lastMessage?: Types.ObjectId; // ID останнього повідомлення
    updatedAt: Date; // Для сортування за активністю
}

const ConversationSchema = new Schema<ConversationDocument>(
    {
        participants: {
            type: [Schema.Types.ObjectId], // Масив ObjectID
            ref: 'User',
            required: true,
            // Розмір масиву може бути обмежений (наприклад, 2 для приватного чату, більше для групового)
        },
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
            required: false,
        },
    },
    {
        timestamps: true, // `createdAt` та `updatedAt`
        versionKey: false,
    }
);

// Створюємо унікальний індекс для приватних чатів між двома користувачами.
// Це гарантує, що між користувачами A і B існує лише одна розмова.
// $all дозволяє Mongoose знайти розмову незалежно від порядку [A, B] чи [B, A].
ConversationSchema.index({ participants: 1 }, { unique: true, partialFilterExpression: { participants: { $size: 2 } } });


const Conversation = model<ConversationDocument>('Conversation', ConversationSchema);
export default Conversation;