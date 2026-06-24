import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';
import { dbAll, dbRun, dbGet } from '../db/schema.js';
import crypto from 'crypto';

const router = Router();
router.use(authMiddleware);

// ── Multer setup ─────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// ── GET /api/materials ────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  const materials = await dbAll('SELECT id, filename, tipo, size, created_at, units_json FROM materials WHERE user_id = $1', [req.user!.id]);
  res.json({ data: materials });
});

// ── POST /api/materials ──────────────────────────────────────────────────────
router.post('/', upload.single('file'), async (req: AuthRequest, res: Response) => {
  const { tipo } = req.body;
  const originalName = req.file?.originalname ?? req.body.filename ?? 'Sin nombre';
  const storedName = req.file?.filename ?? null;
  const size = req.file?.size ?? (Number(req.body.size) || 0);
  const info = await dbRun(
    'INSERT INTO materials (user_id, filename, tipo, size, filepath) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [req.user!.id, originalName, tipo || 'textbook', size, storedName]
  );
  res.json({ data: { id: info.id, filepath: storedName, created: new Date().toISOString() } });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await dbRun('DELETE FROM materials WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  res.json({ data: { deleted: true } });
});

// ── GET /api/materials/:id/units ──────────────────────────────────────────────
router.get('/:id/units', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await dbGet(
      'SELECT units_json FROM materials WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );
    if (!result || !result.units_json) {
      return res.json({ data: [] });
    }
    res.json({ data: JSON.parse(result.units_json) });
  } catch (err: any) {
    console.error('[units] GET error:', err.message, 'params:', req.params.id, req.user?.id);
    res.status(500).json({ error: 'Error loading units', detail: err.message });
  }
});

// ── PUT /api/materials/:id/units ──────────────────────────────────────────────
router.put('/:id/units', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { units } = req.body;
  if (!Array.isArray(units)) {
    return res.status(400).json({ error: 'units must be an array' });
  }
  try {
    await dbRun(
      'UPDATE materials SET units_json = $1 WHERE id = $2 AND user_id = $3',
      [JSON.stringify(units), id, req.user!.id]
    );
    res.json({ data: { ok: true } });
  } catch {
    res.status(500).json({ error: 'Error saving units' });
  }
});

// GET /api/materials/:id/output — returns full result_json (not truncated)
router.get('/:id/output', async (req: AuthRequest, res: Response) => {
  const row = await dbGet(
    'SELECT result_json, user_id FROM motor_results WHERE id = $1',
    [req.params.id]
  ) as { result_json: string; user_id: number } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.user_id !== req.user!.id && req.user!.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('ETag', `"${crypto.createHash('sha1').update(row.result_json).digest('hex').slice(0, 16)}"`);
  try {
    res.json(JSON.parse(row.result_json));
  } catch {
    res.status(500).json({ error: 'Invalid JSON stored' });
  }
});

export default router;
