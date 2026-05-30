import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { dbAll } from '../db/schema.js';

const router = Router();
router.use(authMiddleware);

router.get('/:teacherCode/:dia', async (req, res) => {
  try {
    const { teacherCode, dia } = req.params;
    const rows = await dbAll(
      `SELECT id, teacher_code, dia, hora_inicio, hora_fin, tipo, materia, nivel_grado, ubicacion, orden, created_at
       FROM bloques
       WHERE teacher_code = $1 AND UPPER(dia) = UPPER($2)
       ORDER BY orden, hora_inicio, id`,
      [teacherCode, dia]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[/schedule GET]', err);
    res.status(500).json({ data: [] });
  }
});

export default router;