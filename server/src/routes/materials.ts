import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { dbAll, dbRun, dbGet } from '../db/schema.js';
import { validateBody } from '../middleware/validateBody.js';
import { CreateMaterialSchema } from '../schemas/requests/materials.schema.js';
import crypto from 'crypto';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: any, res) => {
  const materials = await dbAll('SELECT id, filename, tipo, size, created_at FROM materials WHERE user_id = $1', [req.user.id]);
  res.json({ data: materials });
});

router.post('/', validateBody(CreateMaterialSchema), async (req: any, res) => {
  const { filename, tipo, size } = req.body;
  const info = await dbRun(
    'INSERT INTO materials (user_id, filename, tipo, size) VALUES ($1, $2, $3, $4) RETURNING id',
    [req.user.id, filename, tipo || 'textbook', size || 0]
  );
  res.json({ data: { id: info.id, created: new Date().toISOString() } });
});

router.delete('/:id', async (req: any, res) => {
  await dbRun('DELETE FROM materials WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ data: { deleted: true } });
});

// GET /api/materials/:id/output — returns full result_json (not truncated)
router.get('/:id/output', authMiddleware, async (req: any, res) => {
  const row = await dbGet(
    'SELECT result_json, user_id FROM motor_results WHERE id = $1',
    [req.params.id]
  ) as { result_json: string; user_id: number } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('ETag', `"${crypto.createHash('sha1').update(row.result_json).digest('hex').slice(0, 16)}"`);
  try {
    res.json(JSON.parse(row.result_json));
  } catch {
    res.status(500).json({ error: 'Invalid JSON stored' });
  }
});

export default router;
