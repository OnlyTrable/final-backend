// src/middlewares/auth.middleware.ts

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../db/models/User.model.js'; 
import type { TokenPayload } from '../services/token.service.js';

// 💡 Розширення типу Request для додавання userId
declare global {
    namespace Express {
        interface Request {
            userId?: string; 
        }
    }
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_secret';

/**
 * Мідлвар для автентифікації користувача за Access Token у заголовку Bearer.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Отримуємо заголовок Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header missing or malformed.' });
    }

    // 2. Витягуємо токен
    const accessToken = authHeader.split(' ')[1];

    if (!accessToken) {
        return res.status(401).json({ message: 'Access token is required.' });
    }

    try {
        // 3. Верифікація токена
        // Перетворюємо токен у payload (типізований як TokenPayload)
        const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as TokenPayload;
        
        // 4. Перевірка існування користувача та валідності токена в базі
        // Використовуємо findById і явно вибираємо accessToken
        const user = await User.findById(decoded.userId).select('+accessToken');
        
        if (!user || user.accessToken !== accessToken) {
             // Це запобігає використанню старих токенів після логауту/зміни пароля
             return res.status(401).json({ message: 'Invalid or revoked token.' });
        }

        // 5. Зберігаємо userId в об'єкті запиту для контролерів
        req.userId = decoded.userId;

        // 6. Продовжуємо
        next();

    } catch (error) {
        // Обробка помилок JWT: термін дії, невалідний підпис тощо.
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }
        // Обробка інших помилок
        next(error); 
    }
};