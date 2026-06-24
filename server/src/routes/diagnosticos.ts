import { Router } from 'express';
import type { Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';
import { dbAll, dbRun } from '../db/schema.js';
import { validateBody } from '../middleware/validateBody.js';
import { CreateDiagnosticoSchema, UpdateDiagnosticoSchema } from '../schemas/requests/diagnosticos.schema.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const diagnosticos = await dbAll('SELECT * FROM diagnosticos WHERE user_id = $1', [req.user!.id]);
  res.json({ data: diagnosticos });
});

router.post('/', validateBody(CreateDiagnosticoSchema), async (req: AuthRequest, res: Response) => {
  const { estudiante, nivel, area, fecha, resultado } = req.body;
  const info = await dbRun(
    'INSERT INTO diagnosticos (user_id, estudiante, nivel, area, fecha, resultado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [req.user!.id, estudiante, nivel, area || '', fecha || '', resultado || '']
  );
  res.json({ data: { id: info.id } });
});

router.put('/:id', validateBody(UpdateDiagnosticoSchema), async (req: AuthRequest, res: Response) => {
  const { estudiante, nivel, area, fecha, resultado } = req.body;
  await dbRun(
    'UPDATE diagnosticos SET estudiante=$1, nivel=$2, area=$3, fecha=$4, resultado=$5 WHERE id=$6 AND user_id=$7',
    [estudiante, nivel, area, fecha, resultado, req.params.id, req.user!.id]
  );
  res.json({ data: { updated: true } });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await dbRun('DELETE FROM diagnosticos WHERE id=$1 AND user_id=$2', [req.params.id, req.user!.id]);
  res.json({ data: { deleted: true } });
});

export default router;
