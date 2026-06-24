import { Router } from 'express';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';
import { dbGet, dbRun } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validateBody.js';
import { LoginSchema, RegisterSchema, UpdateMeSchema } from '../schemas/requests/auth.schema.js';

const router = Router();

router.post('/login', authLimiter, validateBody(LoginSchema), async (req: AuthRequest, res: Response) => {
  const username = req.body.usuario || req.body.username;
  const password = req.body.contrasena || req.body.password;
  const user = await dbGet('SELECT * FROM users WHERE username = $1', [username]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRY } as Parameters<typeof jwt.sign>[2]
  );
  const csrfToken = crypto.randomUUID();
  res.cookie('csrf_token', csrfToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400000,
  });
  res.json({
    data: {
      token,
      user: { id: user.id, nombre: user.nombre, role: user.role, nivel: user.nivel, grado: user.grado },
    },
  });
});

router.post('/register', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation failed', details: result.error.issues });
  const { username, password, nombre, nivel = 'Primaria', grado = '5to' } = result.data;
  const hash = bcrypt.hashSync(password, 12);
  const info = await dbRun(
    'INSERT INTO users (username, password_hash, nombre, nivel, grado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [username, hash, nombre, nivel, grado]
  );
  res.json({ data: { id: info.id, created: new Date().toISOString() } });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await dbGet('SELECT id, nombre, role, nivel, grado FROM users WHERE id = $1', [req.user!.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ data: user });
});

router.patch('/me', authMiddleware, validateBody(UpdateMeSchema), async (req: AuthRequest, res: Response) => {
  const { student_book } = req.body;
  if (student_book !== undefined) {
    await dbRun('UPDATE users SET student_book = $1 WHERE id = $2', [student_book ? true : false, req.user!.id]);
  }
  res.json({ data: { success: true } });
});

export default router;
