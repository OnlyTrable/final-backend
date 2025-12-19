// src/controllers/messages.controller.ts

import type { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Conversation from "../db/models/Conversation.model.js";
import Message from "../db/models/Message.model.js";
import HttpError from "../utils/HttpError.js";
import User from "../db/models/User.model.js";

// Інтерфейс для параметрів маршруту
interface ConversationParams {
  conversationId: string;
}

// Інтерфейс для тіла запиту (створення повідомлення)
interface CreateMessagePayload {
  recipientId: string; // Користувач, якому надсилаємо повідомлення
  content: string;
}

/**
 * 🚀 Створює нове повідомлення (і розмову, якщо вона ще не існує) та випромінює його.
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

    // ... (Валідація ID)

    const senderObjectId = new Types.ObjectId(senderId);
    const recipientObjectId = new Types.ObjectId(recipientId);

    // 1. Шукаємо або створюємо розмову
    let conversation = await Conversation.findOne({
      participants: { $all: [senderObjectId, recipientObjectId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderObjectId, recipientObjectId],
      });
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
    (conversation as any).lastMessageAt = new Date(); // ✅ Оновлення часу
    await conversation.save();

    // 4. Завантажуємо відправника
    const messageWithSender = await message.populate({
      path: "sender",
      select: "_id username fullName avatarUrl",
    });

    const io = req.app.get("io");
    if (io) {
      const convoId = conversation._id.toString();
      const recipientIdStr = recipientId.toString();

      // Відправляємо в кімнату чату
      io.to(convoId).emit("new_message", messageWithSender);

      // Відправляємо особисто отримувачу (щоб оновити його список зліва)
      io.to(recipientIdStr).emit("new_message", messageWithSender);
    }

    // 5. 🔥 SOCKET.IO: Випромінювання повідомлення
    try {
      const io = req.app.get("io");

      if (io) {
        // 1. Шлемо в кімнату розмови (для тих, хто ЗАРАЗ всередині цього чату)
        // Це оновить історію повідомлень на екрані
        io.to(conversation._id.toString()).emit(
          "new_message",
          messageWithSender,
        );

        // 2. Шлемо особисто отримувачу (на його userId)
        // Це оновить його список діалогів (останнє повідомлення), де б він не був на сайті
        io.to(recipientId.toString()).emit("new_message", messageWithSender);
      }
    } catch (socketError) {
    }

    // 6. Відповідь REST API
    res.status(201).json({
      message: "Message sent successfully.",
      conversationId: conversation._id,
      sentMessage: messageWithSender,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 📚 Отримує історію повідомлень для конкретної розмови.
 * GET /api/messages/:conversationId
 */
export const getMessagesByConversation = async (
  req: Request<ConversationParams, {}, {}>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    if (!userId) {
      return next(HttpError(401, "Not authenticated."));
    }

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);

    // 1. Перевіряємо, чи є користувач учасником розмови
    const conversation = await Conversation.findById(conversationObjectId);

    if (!conversation || !conversation.participants.includes(userObjectId)) {
      return next(
        HttpError(403, "You are not a participant in this conversation."),
      );
    }

    // 2. Отримуємо повідомлення, сортуючи від найстаріших до найновіших
    const messages = await Message.find({ conversation: conversationObjectId })
      .sort({ createdAt: 1 })
      .populate({
        path: "sender",
        select: "_id username fullName avatarUrl",
      })
      .lean();

    // 3. Позначаємо повідомлення як прочитані (для поточного користувача)
    await Message.updateMany(
      {
        conversation: conversationObjectId,
        sender: { $ne: userObjectId },
        isRead: false,
      },
      { $set: { isRead: true } },
    );

    res.status(200).json({
      messages,
      message: "Messages retrieved successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 📜 Отримує список розмов користувача.
 * GET /api/messages/conversations
 */
export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return next(HttpError(401, "Not authenticated."));
    }

    const userObjectId = new Types.ObjectId(userId);

    // 1. Знаходимо всі розмови, де користувач є учасником
    const conversations = await Conversation.find({
      participants: userObjectId,
    })
      .sort({ updatedAt: -1 })
      // Завантажуємо дані учасників
      .populate({
        path: "participants",
        select: "_id username fullName avatarUrl",
      })
      // Завантажуємо дані останнього повідомлення
      .populate({
        path: "lastMessage",
        select: "content sender createdAt isRead",
      })
      .lean();

    // 2. Фільтруємо/форматуємо
    const formattedConversations = conversations.map((conv) => {
      // Отримуємо "іншого" учасника
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== userId,
      );

      // Отримуємо кількість непрочитаних повідомлень (якщо потрібно)
      // Приклад: const unreadCount = await Message.countDocuments({ conversation: conv._id, sender: { $ne: userObjectId }, isRead: false });

      return {
        _id: conv._id,
        updatedAt: conv.updatedAt,
        // Повертаємо останнє повідомлення
        lastMessage: conv.lastMessage,
        // Повертаємо інформацію про співрозмовника
        otherParticipant: otherParticipant || null,
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
