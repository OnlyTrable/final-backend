import type { Request, Response, NextFunction } from 'express';

interface CustomError {
    status?: number;
    message?: string;
}

const errorHandler = (
    error: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { status = 500, message = "Server error" } = error;
    res.status(status).json({
        message,
    });
};

export default errorHandler;