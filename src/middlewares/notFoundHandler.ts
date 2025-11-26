import type { Request, Response } from 'express';

const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    message: `${req.url} ${req.method} not found`
  });
};

export default notFoundHandler;