import type { Request, Response, NextFunction, RequestHandler } from 'express';
import * as z from 'zod';

type ZodObjectSchema = z.ZodObject<any>; 

const validateBody = (schema: ZodObjectSchema): RequestHandler => 
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync(req.body); 
            next();
        } catch (error) {
            if (error instanceof z.ZodError) { 
                res.status(400).json({ 
                    message: 'Validation error',
                    errors: error.issues.map(issue => ({ 
                        path: issue.path.join('.'),
                        message: issue.message
                    })),
                });
            } else {
                next(error); 
            }
        }
    };

export default validateBody;