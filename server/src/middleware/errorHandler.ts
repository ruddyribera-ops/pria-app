import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { status?: number; details?: unknown },
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = err.status || 500;

  // Log with request context
  console.error(`[ERROR] ${req.method} ${req.url} — ${err.message}`, {
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Don't leak stack traces in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Error interno'
      : err.message;

  res.status(status).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
  });
}