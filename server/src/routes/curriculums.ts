import { Router } from 'express';
import type { Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';
import { dbAll, dbGet, dbRun } from '../db/schema.js';
import { validateBody } from '../middleware/validateBody.js';
import { CreateCurriculumSchema } from '../schemas/requests/curriculums.schema.js';

const router = Router();
router.use(authMiddleware);

router.get('/latest', async (req: AuthRequest, res: Response) => {
  const latest = await dbGet('SELECT * FROM curriculums WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [req.user!.id]);
  if (!latest) return res.status(404).json({ error: 'No hay currículo' });
  res.json({ data: latest });
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const curriculums = await dbAll('SELECT * FROM curriculums WHERE user_id = $1 ORDER BY id DESC', [req.user!.id]);
  res.json({ data: curriculums });
});

router.post('/', validateBody(CreateCurriculumSchema), async (req: AuthRequest, res: Response) => {
  const { material_id, unidad_real, temas, contenido_temas, paginas_temas, raw_text } = req.body;
  const info = await dbRun(
    'INSERT INTO curriculums (user_id, material_id, unidad_real, temas, contenido_temas, paginas_temas, raw_text) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [req.user!.id, material_id || null, unidad_real, JSON.stringify(temas), JSON.stringify(contenido_temas), JSON.stringify(paginas_temas), raw_text || '']
  );
  res.json({ data: { id: info.id } });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await dbRun('DELETE FROM curriculums WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  res.json({ data: { deleted: true } });
});

export default router;
