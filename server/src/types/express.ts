import type { Request } from 'express';

export interface AuthUser {
  id: number;
  role: 'admin' | 'teacher';
}

export type AuthRequest = Request & {
  user?: AuthUser;
};