// src/routes/user.router.ts

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import { getProfile, updateProfile } from '../controllers/user.controller.js';
import { updateProfileSchema } from '../schemas/user.schemas.js';

const userRouter: Router = Router();

// Захищений маршрут: лише аутентифіковані користувачі можуть отримати доступ
userRouter.get(
    '/profile', 
    authenticate, // Захист
    getProfile // Виклик контролера
);

userRouter.patch(
    '/profile', 
    authenticate, 
    validateBody(updateProfileSchema), 
    updateProfile 
);

export default userRouter;