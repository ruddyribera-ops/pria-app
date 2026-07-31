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
  const users = await dbAll('SELECT id, username, nombre, role, nivel, grado, teacher_code, created_at FROM users');
  res.json({ data: users });
});

router.get('/users/', authMiddleware, adminOnly, async (req, res) => {
  const users = await dbAll('SELECT id, username, nombre, role, nivel, grado, teacher_code, created_at FROM users');
  res.json({ data: users });
});

router.post('/users', authMiddleware, adminOnly, validateBody(CreateUserSchema), async (req, res) => {
  const { nombre, usuario, password, correo, nivel, grado, teacher_code } = req.body;
  const hash = bcrypt.hashSync(password, 12);
  const info = await dbRun(
    'INSERT INTO users (username, password_hash, email, nombre, nivel, grado, teacher_code) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [usuario, hash, correo || null, nombre, nivel || 'Primaria', grado || '5to', teacher_code || null]
  );
  res.json({ data: { id: info.id, created: new Date().toISOString() } });
});

router.post('/users/', authMiddleware, adminOnly, validateBody(CreateUserSchema), async (req, res) => {
  const { nombre, usuario, password, correo, nivel, grado, teacher_code } = req.body;
  const hash = bcrypt.hashSync(password, 12);
  const info = await dbRun(
    'INSERT INTO users (username, password_hash, email, nombre, nivel, grado, teacher_code) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [usuario, hash, correo || null, nombre, nivel || 'Primaria', grado || '5to', teacher_code || null]
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

// GET /api/admin/archivos — list all user-uploaded files (materials + diagnosticos)
router.get('/archivos', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const [materials, diagnosticos] = await Promise.all([
      dbAll(`
        SELECT m.id, m.user_id, m.filename, m.tipo, m.size, m.created_at,
               u.nombre as user_nombre, u.username as user_username,
               'material' as source
        FROM materials m
        JOIN users u ON u.id = m.user_id
        ORDER BY m.created_at DESC
      `),
      dbAll(`
        SELECT d.id, d.user_id, d.tipo, d.filepath as filename, d.created_at,
               u.nombre as user_nombre, u.username as user_username,
               'diagnostico' as source
        FROM diagnosticos d
        JOIN users u ON u.id = d.user_id
        ORDER BY d.created_at DESC
      `),
    ]);
    res.json({ data: { materials, diagnosticos } });
  } catch (err) {
    console.error('[/admin/archivos GET]', err);
    res.status(500).json({ error: 'Error al obtener archivos' });
  }
});

// DELETE /api/admin/archivos/:source/:id — delete a file by source and id
router.delete('/archivos/:source/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { source, id } = req.params;
    if (source === 'material') {
      await dbRun('DELETE FROM materials WHERE id = $1', [id]);
    } else if (source === 'diagnostico') {
      await dbRun('DELETE FROM diagnosticos WHERE id = $1', [id]);
    } else {
      return res.status(400).json({ error: 'Tipo de archivo inválido' });
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[/admin/archivos DELETE]', err);
    res.status(500).json({ error: 'Error al eliminar archivo' });
  }
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
    const { date } = req.body;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    if (date) {
      await dbRun(
        `DELETE FROM motor_results WHERE user_id = $1 AND DATE(created_at) = $2`,
        [userId, date]
      );
    } else {
      await dbRun(
        `DELETE FROM motor_results WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [userId]
      );
    }
    res.json({ data: { reset: true } });
  } catch (err) {
    console.error('[/admin/reset-day]', err);
    res.status(500).json({ error: 'Error al reiniciar datos' });
  }
});

export default router;
