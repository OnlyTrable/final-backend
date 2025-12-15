import { Router } from 'express';
import type { RequestHandler } from 'express'; 
import { authenticate } from '../middlewares/auth.middleware.js';
import { getNotifications, markAllAsRead } from '../controllers/notification.controller.js';

const notificationRouter: Router = Router();

// =======================================================
// 🔥 РОУТЕР СПОВІЩЕНЬ
// =======================================================

// 1. GET /api/notifications - Отримати список сповіщень
notificationRouter.get(
    '/',
    authenticate,
    (getNotifications as unknown) as RequestHandler
);

// 2. PUT /api/notifications/mark-as-read - Позначити всі як прочитані
notificationRouter.put(
    '/mark-as-read',
    authenticate,
    (markAllAsRead as unknown) as RequestHandler
);


export default notificationRouter;