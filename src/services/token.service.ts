// src/services/token.service.ts

import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// =========================================================================
// ✅ FIX 1: Обов'язкова перевірка наявності секретних ключів
// =========================================================================
if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    // Якщо ключа немає, програма має аварійно завершити роботу!
    throw new Error('One or more JWT secret keys (ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET) are not defined in environment variables! Please check your .env file.');
}
// =========================================================================

export type TokenPayload = { userId: string };

export const generateTokens = (payload: TokenPayload) => {
    
    // TypeScript тепер впевнений, що ACCESS_TOKEN_SECRET є string.
    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: '15m',
    });

    // TypeScript тепер впевнений, що REFRESH_TOKEN_SECRET є string.
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: '1d',
    });

    return {
        accessToken,
        refreshToken,
    };
};