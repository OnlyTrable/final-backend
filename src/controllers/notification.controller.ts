import type { Request, Response, NextFunction } from 'express';
import Notification from '../db/models/Notification.model.js';
import HttpError from '../utils/HttpError.js';
import { Types } from 'mongoose';

// Інтерфейс для Query-параметрів (пагінація)
interface NotificationQuery {
    page?: string;
    limit?: string;
    // Можна додати: isRead?: string; для фільтрації
}

/**
 * 🚀 Отримує список сповіщень для аутентифікованого користувача.
 * GET /api/notifications?page=1&limit=10
 */
export const getNotifications = async (
    req: Request<{}, {}, {}, NotificationQuery>, 
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const skip = (page - 1) * limit;

        if (!userId) {
            return next(HttpError(401, "Not authenticated."));
        }
        
        const userObjectId = new Types.ObjectId(userId);

        // 1. Отримуємо сповіщення
        const notifications = await Notification.find({ recipient: userObjectId })
            .sort({ createdAt: -1 }) // Від найновіших до найстаріших
            .skip(skip)
            .limit(limit)
            // Завантажуємо дані відправника, поста та коментаря
            .populate([
                { path: 'sender', select: '_id username fullName avatarUrl' },
                { path: 'post', select: 'content imageUrl' }, 
                { path: 'comment', select: 'content' },
            ])
            .lean();

        // 2. Отримуємо загальну кількість
        const total = await Notification.countDocuments({ recipient: userObjectId });
        const unreadCount = await Notification.countDocuments({ recipient: userObjectId, isRead: false });

        res.status(200).json({
            notifications,
            meta: {
                total,
                unreadCount,
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
 * 🚀 Позначає всі непрочитані сповіщення як прочитані.
 * PUT /api/notifications/mark-as-read
 */
export const markAllAsRead = async (
    req: Request, 
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.userId;
        
        if (!userId) {
            return next(HttpError(401, "Not authenticated."));
        }

        // Атомарна операція: оновлюємо всі документи, де isRead = false
        await Notification.updateMany(
            { recipient: new Types.ObjectId(userId), isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({
            message: "All notifications marked as read.",
        });

    } catch (error) {
        next(error);
    }
};