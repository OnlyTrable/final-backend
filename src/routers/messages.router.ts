// src/routers/messages.router.ts

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

// 1. GET /api/messages/conversations - Отримати список розмов користувача
messagesRouter.get(
    '/conversations',
    authenticate,
    (getConversations as unknown) as RequestHandler
);

// 2. POST /api/messages - Надіслати нове повідомлення (і створити розмову)
messagesRouter.post(
    '/',
    authenticate,
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