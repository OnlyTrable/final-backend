// src/routes/user.router.ts

import { Router } from "express";
import type { RequestHandler } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.js";
import validateBody from "../middlewares/validateBody.middleware.js";
import {
  getProfile,
  updateProfile,
  updateAvatar,
  searchUsers,
  toggleFollow
} from "../controllers/user.controller.js";
import { updateProfileSchema } from "../schemas/user.schemas.js";

const userRouter: Router = Router();

// DEBUG: Логуємо всі запити, що доходять до userRouter
userRouter.use((req, res, next) => {
  // console.log(
  //   `[UserRouter] Method: ${req.method}, Path: ${req.path}, OriginalUrl: ${req.originalUrl}`,
  // );
  next();
});

// ВАЖЛИВО: Маршрут пошуку має бути ПЕРЕД маршрутами з параметрами (наприклад, /:id),
// інакше "search" може бути сприйнято як id.
userRouter.get(
  "/search",
  authenticate,
  searchUsers as unknown as RequestHandler,
);

userRouter.post(
    "/profile/:id/follow", 
    authenticate, 
    toggleFollow 
);

// Захищений маршрут: лише аутентифіковані користувачі можуть отримати доступ
userRouter.get("/profile", authenticate, getProfile);
userRouter.get(
  "/profile/:id",
  authenticate, // Захист
  getProfile, // Виклик контролера
);

userRouter.patch(
  "/profile",
  authenticate,
  validateBody(updateProfileSchema),
  updateProfile,
);

userRouter.patch(
  "/avatar",
  authenticate,
  upload.single("avatar"), // Приймаємо 1 файл з ключем 'avatar'
  updateAvatar,
);


export default userRouter;
