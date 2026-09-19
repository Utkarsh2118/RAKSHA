import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/httpError.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    return;
  }

  const isHttpError = err instanceof HttpError;
  const statusCode = isHttpError ? err.statusCode : 500;
  const safeMessage = isHttpError ? err.message : 'Internal server error';

  if (!isHttpError) {
    console.error(err);
  }

  res.status(statusCode).json({
    status: 'error',
    message: safeMessage,
  });
}
