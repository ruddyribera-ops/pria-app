import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { dbAll, dbRun } from '../db/schema.js';
import { validateBody } from '../middleware/validateBody.js';
import { CreateUserSchema } from '../schemas/requests/admin.schema.js';

const router = Router();

router.get('/estado-sistema', (req, res) => {
  res.json({
    data: {
      motors: {
        synthesis: 'idle', abp: 'idle', assessment: 'idle',
        plan: 'idle', slides: 'idle', ficha: 'idle', quiz: 'idle',
        tutor: 'idle', pdc: 'idle', recalibrate: 'idle', micro: 'idle',
      },
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

router.put('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { nombre, nivel, grado } = req.body;
  await dbRun(
    'UPDATE users SET nombre = $1, nivel = $2, grado = $3 WHERE id = $4',
    [nombre, nivel || 'Primaria', grado || '5to', id]
  );
  res.json({ data: { id: parseInt(id), updated: new Date().toISOString() } });
});

router.delete('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  await dbRun('DELETE FROM users WHERE id = $1', [id]);
  res.json({ data: { id: parseInt(id), deleted: new Date().toISOString() } });
});

router.get('/cache/stats', authMiddleware, adminOnly, (req, res) => {
  res.json({
    data: {
      entries: 0,
      motores_cache: 0,
      pdfs_cache: 0,
    },
  });
});

router.delete('/cache', authMiddleware, adminOnly, (req, res) => {
  res.json({ data: { cleared: true } });
});

export default router;
