import { Router } from 'express';
import type { Request, Response } from 'express'; // Використовуємо 'type' для чистоти
import { checkDbHealth } from '../controllers/health.controller.js'; // ✅ Переконайтеся, що шлях правильний

const healthRouter = Router();

/**
 * Маршрути для перевірки стану сервера та бази даних.
 */
healthRouter.get('/db', checkDbHealth);

export default healthRouter;