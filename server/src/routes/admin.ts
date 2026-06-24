import { Router } from 'express';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';
import { dbAll, dbRun } from '../db/schema.js';
import { getAllMotorState } from '../db/motorState.js';
import { validateBody } from '../middleware/validateBody.js';
import { CreateUserSchema } from '../schemas/requests/admin.schema.js';

const router = Router();

router.get('/estado-sistema', authMiddleware, (req: AuthRequest, res: Response) => {
  const motors = getAllMotorState(req.user!.id);
  res.json({
    data: {
      motors,
      lastUpdated: new Date().toISOString(),
    },
  });
});

router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  const users = await dbAll('SELECT id, username, nombre, role, nivel, grado, created_at FROM users');
  res.json({ data: users });
});

router.get('/users/', authMiddleware, adminOnly, async (req, res) => {
  const users = await dbAll('SELECT id, username, nombre, role, nivel, grado, created_at FROM users');
  res.json({ data: users });
});

router.post('/users', authMiddleware, adminOnly, validateBody(CreateUserSchema), async (req, res) => {
  const { nombre, usuario, password, nivel, grado } = req.body;
  const hash = bcrypt.hashSync(password, 12);
  const info = await dbRun(
    'INSERT INTO users (username, password_hash, nombre, nivel, grado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [usuario, hash, nombre, nivel || 'Primaria', grado || '5to']
  );
  res.json({ data: { id: info.id, created: new Date().toISOString() } });
});

router.post('/users/', authMiddleware, adminOnly, validateBody(CreateUserSchema), async (req, res) => {
  const { nombre, usuario, password, nivel, grado } = req.body;
  const hash = bcrypt.hashSync(password, 12);
  const info = await dbRun(
    'INSERT INTO users (username, password_hash, nombre, nivel, grado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [usuario, hash, nombre, nivel || 'Primaria', grado || '5to']
  );
  res.json({ data: { id: info.id, created: new Date().toISOString() } });
});

router.put('/users/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { nombre, nivel, grado } = req.body;
  await dbRun(
    'UPDATE users SET nombre = $1, nivel = $2, grado = $3 WHERE id = $4',
    [nombre, nivel || 'Primaria', grado || '5to', id]
  );
  res.json({ data: { id: parseInt(id), updated: new Date().toISOString() } });
});

router.delete('/users/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  await dbRun('DELETE FROM users WHERE id = $1', [id]);
  res.json({ data: { id: parseInt(id), deleted: new Date().toISOString() } });
});

router.get('/cache/stats', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const [mats, diags, results, bloques] = await Promise.all([
      dbAll('SELECT COUNT(*)::int as c FROM materials'),
      dbAll('SELECT COUNT(*)::int as c FROM diagnosticos'),
      dbAll('SELECT COUNT(*)::int as c FROM motor_results'),
      dbAll('SELECT COUNT(*)::int as c FROM bloques'),
    ]);
    const entries = (mats[0]?.c ?? 0) + (diags[0]?.c ?? 0) + (results[0]?.c ?? 0) + (bloques[0]?.c ?? 0);
    res.json({
      data: {
        entries,
        motores_cache: results[0]?.c ?? 0,
        pdfs_cache: mats[0]?.c ?? 0,
      },
    });
  } catch {
    res.json({ data: { entries: 0, motores_cache: 0, pdfs_cache: 0 } });
  }
});

router.delete('/cache', authMiddleware, adminOnly, async (_req, res) => {
  try {
    // Clear motor results cache (most impactful cache)
    await dbRun('DELETE FROM motor_results WHERE DATE(created_at) < CURRENT_DATE');
    res.json({ data: { cleared: true } });
  } catch (err) {
    console.error('[/admin/cache DELETE]', err);
    res.status(500).json({ error: 'Error al limpiar cache' });
  }
});

router.post('/reset-day', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    await dbRun(
      `DELETE FROM motor_results WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [userId]
    );
    res.json({ data: { reset: true } });
  } catch (err) {
    console.error('[/admin/reset-day]', err);
    res.status(500).json({ error: 'Error al reiniciar datos' });
  }
});

export default router;
