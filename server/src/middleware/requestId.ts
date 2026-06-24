import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const REQUEST_ID_HEADER = 'x-request-id';
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

declare global {
  // Extend Express.Request with our custom properties
  namespace Express {
    interface Request {
      requestId?: string;
      log?: import('pino').Logger;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Honor client-provided request ID (for tracing across services), else generate
  const raw = req.headers[REQUEST_ID_HEADER] as string | undefined;
  let requestId: string;

  if (typeof raw === 'string' && raw.length > 0 && raw.length <= MAX_REQUEST_ID_LENGTH && SAFE_ID_REGEX.test(raw)) {
    requestId = raw; // Client-provided, valid
  } else {
    requestId = uuidv4(); // Fallback: generate fresh
  }

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
};