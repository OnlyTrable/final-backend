// src/routes/user.router.ts

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import { getProfile, updateProfile, updateAvatar } from '../controllers/user.controller.js';
import { updateProfileSchema,  } from '../schemas/user.schemas.js';

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

userRouter.patch(
    '/avatar',
    authenticate,
    upload.single('avatar'), // Приймаємо 1 файл з ключем 'avatar'
    updateAvatar
);

export default userRouter;