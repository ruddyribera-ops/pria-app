import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';
import { dbAll, dbRun, dbGet } from '../db/schema.js';
import { validateBody } from '../middleware/validateBody.js';
import { CreateDiagnosticoSchema, UpdateDiagnosticoSchema } from '../schemas/requests/diagnosticos.schema.js';
import { uploadDiagnostico } from '../middleware/upload.js';
import multer from 'multer';

// Wrap multer middleware to convert errors (fileFilter rejection, size limit, etc.)
// into proper HTTP responses (400 for invalid type, 413 for size limit) instead of 500.
const handleMulter = (middleware: RequestHandler): RequestHandler => (req, res, next) => {
  middleware(req, res, (err: any) => {
    if (err) {
      const status = err?.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = err?.message ?? 'Error de upload';
      res.status(status).json({ error: message });
      return;
    }
    next();
  });
};

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

/**
 * POST /api/diagnosticos/upload
 * Accepts a file via multipart/form-data under field name "file".
 * Query param `tipo` is stored as the diagnostico type.
 * Creates a new diagnostico record for the authenticated user.
 * Returns the saved record including the server-assigned filepath.
 */
router.post('/upload', handleMulter(uploadDiagnostico.single('file')), async (req: AuthRequest, res: Response) => {
  const { tipo } = req.query as { tipo?: string };

  if (!req.file) {
    res.status(400).json({ error: 'No se envió ningún archivo' });
    return;
  }

  if (!tipo || typeof tipo !== 'string' || tipo.trim() === '') {
    res.status(400).json({ error: 'Parámetro "tipo" es requerido' });
    return;
  }

  const filepath = req.file.filename;
  const info = await dbRun(
    'INSERT INTO diagnosticos (user_id, estudiante, tipo, filepath, nivel, area, fecha, resultado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
    [req.user!.id, 'Sin asignar', tipo, filepath, 'Primaria', '', '', '']
  );

  const record = await dbGet('SELECT * FROM diagnosticos WHERE id = $1', [info.id]);
  res.json({ data: record });
});

export default router;
