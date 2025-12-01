// src/middlewares/errorHandler.ts

import type { Request, Response, NextFunction } from 'express';

// Тип Mongoose Error, який містить властивості для обробки Duplicate Key Error (11000)
interface MongooseError extends Error {
    code?: number;
    keyValue?: { [key: string]: string };
}

const errorHandler = (err: MongooseError, req: Request, res: Response, next: NextFunction): void => {
    let statusCode: number = res.statusCode === 200 ? 500 : res.statusCode;
    let message: string = err.message || 'Internal Server Error';
    let errors: any = undefined;

    // 1. Обробка Mongoose Duplicate Key Error (Код 11000)
    if (err.code === 11000 && err.keyValue) {
        // Отримуємо назву поля, яке спричинило конфлікт (наприклад, 'email' або 'username')
        const field: string = Object.keys(err.keyValue)[0]!;
        
        statusCode = 409; // Conflict
        message = `Resource Conflict`;
        
        errors = [{
            path: field,
            message: `The ${field} '${err.keyValue[field]}' is already in use.`
        }];
    }
    
    // 2. Обробка інших поширених помилок Mongoose (наприклад, ValidationError) можна додати тут

    // 3. Відправлення відповіді
    res.status(statusCode).json({
        message: message,
        errors: errors,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

export default errorHandler;