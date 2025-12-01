// src/controllers/user.controller.ts

import type { Request, Response, NextFunction } from 'express';
import User from '../db/models/User.model.js';
import type { UpdateProfilePayload } from '../schemas/user.schemas.js';

/**
 * Отримує дані профілю аутентифікованого користувача.
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Ми впевнені, що req.userId існує завдяки auth.middleware.ts
        const userId = req.userId; 

        // 1. Шукаємо користувача, але цього разу БЕЗ пароля та токенів
        const user = await User.findById(userId);

        if (!user) {
            // Теоретично, цього не повинно статися, якщо токен валідний і не відкликаний
            return res.status(404).json({ message: "User profile not found." });
        }

        // 2. Повертаємо дані профілю
        // user.toObject() автоматично видалить пароль, токени та __v (завдяки transformUser)
        const userResponse = user.toObject();

        res.status(200).json({
            message: "User profile retrieved successfully.",
            user: userResponse,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Оновлює дані профілю аутентифікованого користувача.
 */
export const updateProfile = async (req: Request<{}, {}, UpdateProfilePayload>, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId; // ID від мідлвару authenticate
        const updateData = req.body; // Дані для оновлення (валідовані Zod)

        if (!userId) {
             return res.status(401).json({ message: "Not authenticated." });
        }
        
        // 1. ПЕРЕВІРКА УНІКАЛЬНОСТІ USERNAME (якщо його намагаються змінити)
        if (updateData.username) {
            const existingUser = await User.findOne({ 
                username: updateData.username,
                _id: { $ne: userId } // Виключаємо поточного користувача з пошуку
            });

            if (existingUser) {
                // Створюємо помилку, яку обробник помилок розпізнає як конфлікт 409
                const error = new Error('Duplicate Key Error');
                // @ts-ignore
                error.code = 11000;
                // @ts-ignore
                error.keyValue = { username: updateData.username };
                return next(error); 
            }
        }
        
        // 2. ОНОВЛЕННЯ КОРИСТУВАЧА
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData }, // $set оновлює лише ті поля, які присутні в updateData
            { 
                new: true, // Повернути оновлений документ
                runValidators: true // Запустити валідатори схеми Mongoose (наприклад, для max length)
            } 
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User profile not found." });
        }
        
        // 3. Відповідь
        const userResponse = updatedUser.toObject();

        res.status(200).json({
            message: "User profile updated successfully.",
            user: userResponse,
        });

    } catch (error) {
        next(error);
    }
};