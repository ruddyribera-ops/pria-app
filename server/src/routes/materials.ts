import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { dbAll, dbRun } from '../db/schema.js';
import { validateBody } from '../middleware/validateBody.js';
import { CreateMaterialSchema } from '../schemas/requests/materials.schema.js';

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

export default router;
