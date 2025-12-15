// src/routers/messages.router.ts (ПОВНИЙ КОД)

import { Router } from 'express';
import type { RequestHandler } from 'express'; 
import { authenticate } from '../middlewares/auth.middleware.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import { 
    sendMessage, 
    getMessagesByConversation, 
    getConversations 
} from '../controllers/messages.controller.js';

// ПЕРЕВІРТЕ: Цей файл має існувати у вас в `src/schemas/`
import { createMessageSchema } from '../schemas/message.schemas.js'; 

const messagesRouter: Router = Router();

// =======================================================
// РОУТЕР ПОВІДОМЛЕНЬ (MESSAGES)
// =======================================================

// 1. GET /api/messages/conversations - Отримати список розмов користувача
messagesRouter.get(
    '/conversations',
    authenticate,
    (getConversations as unknown) as RequestHandler
);

// 2. POST /api/messages - Надіслати нове повідомлення (і створити розмову, якщо потрібно)
messagesRouter.post(
    '/',
    authenticate,
    // Використовуємо схему валідації
    validateBody(createMessageSchema), 
    (sendMessage as unknown) as RequestHandler
);

// 3. GET /api/messages/:conversationId - Отримати історію повідомлень для розмови
messagesRouter.get(
    '/:conversationId',
    authenticate,
    (getMessagesByConversation as unknown) as RequestHandler
);

export default messagesRouter;