import type { Request, Response, NextFunction } from 'express';
interface CustomError {
    status?: number;
    message?: string;
}
declare const errorHandler: (error: CustomError, req: Request, res: Response, next: NextFunction) => void;
export default errorHandler;
//# sourceMappingURL=errorHandler.d.ts.map