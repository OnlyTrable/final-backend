import { Router } from 'express';
import type { RequestHandler } from 'express'; // Імпортуємо як тип
import { authenticate } from '../middlewares/auth.middleware.js';
import { toggleFollow } from '../controllers/follow.controller.js';

const followRouter: Router = Router();

// =======================================================
// МАРШРУТ ДЛЯ ПІДПИСКИ/ВІДПИСКИ
// POST /api/follow/:userId
// =======================================================
followRouter.post(
    '/:userId', // ID цільового користувача
    authenticate, 
    // Використовуємо двокрокове приведення типу для уникнення помилок
    (toggleFollow as unknown) as RequestHandler 
);

export default followRouter;