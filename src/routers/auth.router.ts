import { Router } from 'express';
import validateBody from '../middlewares/validateBody.middleware.js'; // мідлвар
import { registerSchema, loginSchema } from '../schemas/auth.schemas.js'; // Zod-схеми
import { register, login, logout, refresh } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
const authRouter: Router = Router();

authRouter.post(
    '/register',
    validateBody(registerSchema),
    register // 🔥 ЗАМІНЕНО: Викликаємо контролер Mongoose
);

authRouter.post(
    '/login',
    validateBody(loginSchema),
    login // 🔥 ЗАМІНЕНО на функцію контролера
);

authRouter.post(
    '/logout',
    authenticate, // Захист: переконаємося, що запит має дійсний токен
    logout
);

authRouter.post(
    '/refresh',
    refresh // Не використовуємо validateBody чи authenticate
);

export default authRouter;