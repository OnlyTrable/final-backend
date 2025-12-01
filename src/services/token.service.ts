// src/services/token.service.ts (Оновлено)

import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_secret';

export type TokenPayload = { userId: string };

export const generateTokens = (payload: TokenPayload) => {
    
    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
    });

    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: '30d',
    });

    return {
        accessToken,
        refreshToken,
    };
};