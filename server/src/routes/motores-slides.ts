// server/src/routes/motores-slides.ts
// PATCH /api/motores/slides/:id — update slide deck in DB + recompute quality score
import { Router } from 'express';
import { z } from 'zod';
import { dbGet, dbRun } from '../db/schema.js';
import { SlidesSchema } from '../schemas/slides.schema.js';
import { checkQuality } from '../lib/quality/checker.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';

const router = Router();
router.use(authMiddleware);

// ── P1-5: Spanish text post-processing ──
// Cleans common LLM artifacts from generated slide text fields.
function cleanSpanishText(text: string): string {
  if (!text) return text;
  let cleaned = text;
  // Remove Chinese/CJK characters
  cleaned = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, '');
  // Remove zero-width spaces and other invisible Unicode control chars
  cleaned = cleaned.replace(/[\u200b-\u200f\u2028-\u202f\ufeff]/g, '');
  // Fix run-on words: insert space before capital letters mid-word (camelCase artifacts)
  cleaned = cleaned.replace(/([a-zñáéíóú])([A-ZÑÁÉÍÓÚ])/g, '$1 $2');
  // Fix known typos: "solcalienta" → "sol calienta"
  cleaned = cleaned.replace(/sol\s*calienta/gi, 'sol calienta');
  // Remove "•" and "◆" from Spanish text fields, replace with "-"
  cleaned = cleaned.replace(/[•◆]/g, '-');
  // Collapse multiple spaces
  cleaned = cleaned.replace(/  +/g, ' ').trim();
  return cleaned;
}

function cleanSlideTextFields(slide: Record<string, unknown>): Record<string, unknown> {
  const textFields = ['titulo', 'texto_pantalla', 'guion_docente', 'callout'] as const;
  const cleaned = { ...slide };
  for (const field of textFields) {
    const val = cleaned[field];
    if (typeof val === 'string') {
      cleaned[field] = cleanSpanishText(val);
    }
  }
  return cleaned;
}

/**
 * PATCH /api/motores/slides/:id
 * Updates the slides array in result_json and recomputes quality score.
 * Auth: user can only update their own motor_results (or admin).
 */
router.patch('/motores/slides/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;

    // Accept { data: { output: [...] } } wrapper OR raw { slides: [...] }
    let slidesArray: z.infer<typeof SlidesSchema>;

    if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      const dataObj = body.data as Record<string, unknown>;
      const output = dataObj.output as unknown;
      slidesArray = SlidesSchema.parse(output);
    } else if (Array.isArray(body.slides)) {
      slidesArray = SlidesSchema.parse(body.slides);
    } else if (Array.isArray(body)) {
      // Fallback: body is the raw array
      slidesArray = SlidesSchema.parse(body);
    } else {
      return res.status(400).json({ error: 'Invalid slides schema: expected { data: { output: [...] } } or { slides: [...] }' });
    }

    // ── P1-5: Apply Spanish text cleanup to all slide text fields ──
    slidesArray = slidesArray.map(cleanSlideTextFields) as z.infer<typeof SlidesSchema>;

    // Verify ownership: motor_result belongs to this user
    const row = await dbGet(
      'SELECT id, user_id, result_json FROM motor_results WHERE id = $1',
      [id]
    ) as { id: number; user_id: number; result_json: string } | undefined;

    if (!row) {
      return res.status(404).json({ error: 'Motor result not found' });
    }

    // Ownership check: user can only update their own results (or admin)
    if (row.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado para editar este resultado' });
    }

    // Parse existing result_json to get full structure
    let existingPayload: Record<string, unknown> = {};
    try {
      existingPayload = JSON.parse(row.result_json);
    } catch {
      // If existing result_json is not valid JSON, start fresh
      existingPayload = {};
    }

    // Recompute quality (~10ms, cheap operation)
    const quality = checkQuality('slides', slidesArray, {});

    // Build updated payload — preserve fidelity if present, update quality + output
    const updatedPayload = {
      ...existingPayload,
      quality,
      output: slidesArray,
    };

    // Persist to DB
    await dbRun(
      'UPDATE motor_results SET result_json = $1, created_at = created_at WHERE id = $2',
      [JSON.stringify(updatedPayload), id]
    );

    res.json({
      id,
      quality,
      output: slidesArray,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid slides schema',
        details: err.errors.map((e) => ({
          campo: e.path.join('.'),
          problema: e.message,
        })),
      });
    }
    console.error('[motores/slides PATCH]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
