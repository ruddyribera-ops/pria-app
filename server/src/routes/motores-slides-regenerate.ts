/**
 * motores-slides-regenerate.ts
 * POST /api/motores/slides/:id/regenerate-slide — regenerate ONE slide via LLM delta
 *
 * Auth: requires valid JWT Bearer token.
 * Ownership: user can only regenerate slides from their own motor_results (or admin).
 */
import { Router } from 'express';
import { z } from 'zod';
import { dbGet } from '../db/schema.js';
import { regenerateSingleSlide } from '../lib/motores/regenerateSingleSlide.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';

const router = Router();
router.use(authMiddleware);

const regenerateSchema = z.object({
  slide_index: z.number().int().min(0).max(19),
  feedback: z.string().min(1, 'Feedback is required').max(500, 'Feedback too long (max 500 chars)'),
  current_slide: z.record(z.unknown()), // validated by regenerateSingleSlide
});

/**
 * POST /api/motores/slides/:id/regenerate-slide
 *
 * Request body:
 *   { slide_index: number, feedback: string, current_slide: SlideObject }
 *
 * Response:
 *   { slide: SlideObject, quality: QualityScore, slide_index: number }
 */
router.post('/motores/slides/:id/regenerate-slide', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    // Parse + validate request body
    const parsed = regenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.errors.map(e => ({
          campo: e.path.join('.'),
          problema: e.message,
        })),
      });
    }

    const { slide_index, feedback, current_slide } = parsed.data;
    const motorResultId = parseInt(id, 10);
    if (isNaN(motorResultId)) {
      return res.status(400).json({ error: 'Invalid motor result ID' });
    }

    // Verify ownership: motor_result belongs to this user (or user is admin)
    const row = await dbGet(
      'SELECT id, user_id FROM motor_results WHERE id = $1',
      [id],
    ) as { id: number; user_id: number } | undefined;

    if (!row) {
      return res.status(404).json({ error: 'Motor result not found' });
    }

    if (row.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado para regenerar este resultado' });
    }

    // Execute regeneration
    const result = await regenerateSingleSlide({
      motorResultId,
      slideIndex: slide_index,
      feedback,
      currentSlide: current_slide as Record<string, unknown>,
      userId: req.user!.id,
    });

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[regenerate-slide] Error:', message);

    // Specific error responses
    if (message.includes('not found') || message.includes('out of bounds')) {
      return res.status(400).json({ error: message });
    }

    res.status(500).json({ error: message || 'Internal server error' });
  }
});

export default router;
