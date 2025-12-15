import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Conversation from '../db/models/Conversation.model.js';
import Message from '../db/models/Message.model.js';
import HttpError from '../utils/HttpError.js';
import User from '../db/models/User.model.js';

// Інтерфейс для параметрів маршруту
interface ConversationParams {
    conversationId: string;
}

// Інтерфейс для тіла запиту (створення повідомлення)
interface CreateMessagePayload {
    recipientId: string; // Користувач, якому надсилаємо повідомлення (для першого повідомлення)
    content: string;
}

/**
 * 🚀 Створює нове повідомлення (і розмову, якщо вона ще не існує).
 * POST /api/messages
 */
export const sendMessage = async (
    req: Request<{}, {}, CreateMessagePayload>, 
    res: Response,
    next: NextFunction,
) => {
    try {
        const senderId = req.userId;
        const { recipientId, content } = req.body;

        if (!senderId || !recipientId) {
            return next(HttpError(401, "Sender and recipient IDs are required."));
        }
        if (senderId === recipientId) {
            return next(HttpError(400, "Cannot send message to yourself."));
        }
        
        const senderObjectId = new Types.ObjectId(senderId);
        const recipientObjectId = new Types.ObjectId(recipientId);

        // 1. Шукаємо або створюємо розмову
        let conversation = await Conversation.findOne({
            participants: { $all: [senderObjectId, recipientObjectId] },
            // Примітка: ця логіка передбачає, що ми завжди створюємо розмову
            // для двох користувачів, коли вони вперше починають чат.
        });
        
        if (!conversation) {
            // Якщо розмови немає, створюємо нову
            conversation = await Conversation.create({
                participants: [senderObjectId, recipientObjectId],
            });
            // Перевіряємо, чи існує отримувач
            const recipientUser = await User.findById(recipientObjectId);
            if (!recipientUser) {
                return next(HttpError(404, "Recipient user not found."));
            }
        }

        // 2. Створюємо повідомлення
        const message = await Message.create({
            conversation: conversation._id,
            sender: senderObjectId,
            content: content,
            isRead: false,
        });

        // 3. Оновлюємо поле `lastMessage` у розмові
        conversation.lastMessage = message._id;
        await conversation.save();

        // 4. Завантажуємо відправника для відповіді
        const messageWithSender = await message.populate({
            path: 'sender',
            select: '_id username fullName avatarUrl'
        });

        res.status(201).json({
            mmessage: "Message sent successfully.", // ✅ 1. Рядок повідомлення
            conversationId: conversation._id,
            sentMessage: messageWithSender,      // ✅ 2. САМ об'єкт повідомлення
            // У реальному застосуванні тут можна було б надіслати Socket.IO івент
        });

    } catch (error) {
        next(error);
    }
};


/**
 * 🚀 Отримує повідомлення для конкретної розмови.
 * GET /api/messages/:conversationId?page=1&limit=20
 */
export const getMessagesByConversation = async (
    req: Request<ConversationParams>, 
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.userId;
        const { conversationId } = req.params;
        const page = parseInt(req.query.page as string || '1', 10);
        const limit = parseInt(req.query.limit as string || '20', 10);
        const skip = (page - 1) * limit;

        const conversationObjectId = new Types.ObjectId(conversationId);
        const userObjectId = new Types.ObjectId(userId!);

        // 1. Перевіряємо, чи є користувач учасником цієї розмови
        const conversation = await Conversation.findById(conversationObjectId);

        if (!conversation || !conversation.participants.includes(userObjectId)) {
            return next(HttpError(404, "Conversation not found or you are not a participant."));
        }

        // 2. Отримуємо повідомлення, сортуємо від нових до старих
        const messages = await Message.find({ conversation: conversationObjectId })
            .sort({ createdAt: -1 }) // Від нових до старих
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'sender',
                select: '_id username fullName avatarUrl'
            })
            .lean();

        // 3. Змінюємо порядок на фронтенд-дружній (від старих до нових)
        const reversedMessages = messages.reverse();

        // 4. Отримуємо загальну кількість
        const total = await Message.countDocuments({ conversation: conversationObjectId });

        res.status(200).json({
            messages: reversedMessages,
            meta: {
                total,
                currentPage: page,
                limit: limit,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error) {
        next(error);
    }
};

/**
 * 🚀 Отримує список розмов користувача.
 * GET /api/messages/conversations
 */
export const getConversations = async (
    req: Request, 
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.userId;
        const userObjectId = new Types.ObjectId(userId!);

        // 1. Знаходимо всі розмови, де користувач є учасником
        const conversations = await Conversation.find({ participants: userObjectId })
            // Сортуємо за останнім оновленням
            .sort({ updatedAt: -1 })
            // Завантажуємо дані учасників
            .populate({
                path: 'participants',
                select: '_id username fullName avatarUrl',
                // Виключаємо поточного користувача зі списку учасників усередині об'єкта
                match: { _id: { $ne: userObjectId } },
            })
            // Завантажуємо дані останнього повідомлення
            .populate({
                path: 'lastMessage',
                select: 'content sender createdAt isRead'
            })
            .lean();

        // 2. Фільтруємо/форматуємо
        const formattedConversations = conversations.map(conv => {
            // Отримуємо "іншого" учасника (в приватних чатах)
            const otherParticipant = conv.participants.filter(p => p._id.toString() !== userId)[0];
            
            return {
                _id: conv._id,
                updatedAt: conv.updatedAt,
                // Повертаємо останнє повідомлення як об'єкт
                lastMessage: conv.lastMessage, 
                // Повертаємо інформацію про співрозмовника
                otherParticipant: otherParticipant || null, 
                // ... інші дані, якщо потрібно (наприклад, кількість непрочитаних)
            };
        });

        res.status(200).json({
            conversations: formattedConversations,
            message: "Conversations list retrieved successfully.",
        });

    } catch (error) {
        next(error);
    }
};