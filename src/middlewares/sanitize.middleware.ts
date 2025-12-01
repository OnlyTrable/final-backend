import mongoSanitize from 'express-mongo-sanitize';
import type { RequestHandler } from 'express';

const mongoSanitizeMiddleware: RequestHandler = mongoSanitize();

export default mongoSanitizeMiddleware;