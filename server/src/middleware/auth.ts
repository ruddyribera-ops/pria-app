import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import { config } from '../config.js';
import type { AuthRequest, AuthUser } from '../types/express.js';

export interface AuthPayload {
  sub: number;
  role: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.JWT_SECRET) as unknown as AuthPayload;
    req.user = { id: payload.sub, role: payload.role as AuthUser['role'] };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
}