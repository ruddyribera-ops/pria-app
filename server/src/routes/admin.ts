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

router.post('/users', authMiddleware, adminOnly, validateBody(CreateUserSchema), async (req, res) => {
  const { nombre, usuario, password, nivel, grado } = req.body;
  const hash = bcrypt.hashSync(password, 12);
  const info = await dbRun(
    'INSERT INTO users (username, password_hash, nombre, nivel, grado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [usuario, hash, nombre, nivel || 'Primaria', grado || '5to']
  );
  res.json({ data: { id: info.id, created: new Date().toISOString() } });
});

export default router;
