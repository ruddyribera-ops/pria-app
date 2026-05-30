import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { dbAll, dbGet, dbRun } from '../db/schema.js';

const router = Router();
router.use(authMiddleware);

// GET /api/blocks — list all blocks, optionally filter by teacher_code
router.get('/', async (req, res) => {
  try {
    const { teacher_code } = req.query;
    let rows: any[];
    if (teacher_code) {
      rows = await dbAll(
        'SELECT id, teacher_code, dia, hora_inicio, hora_fin, tipo, materia, nivel_grado, ubicacion, orden, created_at FROM bloques WHERE teacher_code = $1 ORDER BY orden, id',
        [teacher_code]
      );
    } else {
      rows = await dbAll(
        'SELECT id, teacher_code, dia, hora_inicio, hora_fin, tipo, materia, nivel_grado, ubicacion, orden, created_at FROM bloques ORDER BY teacher_code, orden, id'
      );
    }
    res.json({ data: rows });
  } catch (err) {
    console.error('[/blocks GET]', err);
    res.status(500).json({ error: 'Error al obtener bloques' });
  }
});

// POST /api/blocks — create a block
router.post('/', async (req, res) => {
  try {
    const { teacher_code, dia, hora_inicio, hora_fin, tipo, materia, nivel_grado, ubicacion, orden } = req.body;
    if (!teacher_code || !dia || !hora_inicio || !hora_fin || !tipo) {
      return res.status(400).json({ error: 'Faltan campos requeridos: teacher_code, dia, hora_inicio, hora_fin, tipo' });
    }
    const info = await dbRun(
      'INSERT INTO bloques (teacher_code, dia, hora_inicio, hora_fin, tipo, materia, nivel_grado, ubicacion, orden) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at',
      [teacher_code, dia, hora_inicio, hora_fin, tipo, materia ?? null, nivel_grado ?? null, ubicacion ?? null, orden ?? 0]
    );
    const row = await dbGet('SELECT id, teacher_code, dia, hora_inicio, hora_fin, tipo, materia, nivel_grado, ubicacion, orden, created_at FROM bloques WHERE id = $1', [info.id]);
    res.json({ data: row });
  } catch (err) {
    console.error('[/blocks POST]', err);
    res.status(500).json({ error: 'Error al crear bloque' });
  }
});

// PUT /api/blocks/:id — update a block
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dia, hora_inicio, hora_fin, tipo, materia, nivel_grado, ubicacion, orden } = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (dia !== undefined) { fields.push(`dia = $${i++}`); vals.push(dia); }
    if (hora_inicio !== undefined) { fields.push(`hora_inicio = $${i++}`); vals.push(hora_inicio); }
    if (hora_fin !== undefined) { fields.push(`hora_fin = $${i++}`); vals.push(hora_fin); }
    if (tipo !== undefined) { fields.push(`tipo = $${i++}`); vals.push(tipo); }
    if (materia !== undefined) { fields.push(`materia = $${i++}`); vals.push(materia); }
    if (nivel_grado !== undefined) { fields.push(`nivel_grado = $${i++}`); vals.push(nivel_grado); }
    if (ubicacion !== undefined) { fields.push(`ubicacion = $${i++}`); vals.push(ubicacion); }
    if (orden !== undefined) { fields.push(`orden = $${i++}`); vals.push(orden); }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    vals.push(id);
    await dbRun(`UPDATE bloques SET ${fields.join(', ')} WHERE id = $${i}`, vals);
    const row = await dbGet('SELECT id, teacher_code, dia, hora_inicio, hora_fin, tipo, materia, nivel_grado, ubicacion, orden, created_at FROM bloques WHERE id = $1', [id]);
    res.json({ data: row });
  } catch (err) {
    console.error('[/blocks PUT]', err);
    res.status(500).json({ error: 'Error al actualizar bloque' });
  }
});

// DELETE /api/blocks/:id — delete a block
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM bloques WHERE id = $1', [id]);
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[/blocks DELETE]', err);
    res.status(500).json({ error: 'Error al eliminar bloque' });
  }
});

export default router;