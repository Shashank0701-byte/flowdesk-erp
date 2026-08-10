import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async Express handler so unhandled promise rejections
 * are forwarded to the global error handler via next(err).
 * Express 4 does not do this automatically.
 */
export const asyncHandler =
  (fn: AsyncRouteHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
