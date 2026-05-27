import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { dbAll, dbGet, dbRun } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validateBody.js';
import { LoginSchema, RegisterSchema, UpdateMeSchema } from '../schemas/requests/auth.schema.js';

const router = Router();

router.post('/login', authLimiter, validateBody(LoginSchema), async (req, res) => {
  const { username, password } = req.body;
  const user = await dbGet('SELECT * FROM users WHERE username = $1', [username]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRY as any });
  res.json({
    data: {
      token,
      user: { id: user.id, nombre: user.nombre, role: user.role, nivel: user.nivel, grado: user.grado },
    },
  });
});

router.post('/register', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation failed', details: result.error.issues });
  const { username, password, nombre, nivel = 'Primaria', grado = '5to' } = result.data;
  const hash = bcrypt.hashSync(password, 12);
  const info = await dbRun(
    'INSERT INTO users (username, password_hash, nombre, nivel, grado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [username, hash, nombre, nivel, grado]
  );
  res.json({ data: { id: info.lastInsertRowid, created: new Date().toISOString() } });
});

router.get('/me', authMiddleware, async (req: any, res) => {
  const user = await dbGet('SELECT id, nombre, role, nivel, grado, student_book FROM users WHERE id = $1', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ data: user });
});

router.patch('/me', authMiddleware, validateBody(UpdateMeSchema), async (req: any, res) => {
  const { student_book } = req.body;
  if (student_book !== undefined) {
    await dbRun('UPDATE users SET student_book = $1 WHERE id = $2', [student_book ? true : false, req.user.id]);
  }
  res.json({ data: { success: true } });
});

export default router;
