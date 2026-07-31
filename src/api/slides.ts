/**
 * Slides API client — PATCH endpoint for persisting slide edits.
 * The backend lives at http://localhost:3000/api
 */

import client from './client';
import type { SlidesOutput } from '../types/motor-types';

interface PatchSlidesResponse {
  id: number;
  quality: {
    overall: number;
    flags: unknown[];
    suggestions: string[];
  };
  output: SlidesOutput;
  [key: string]: unknown;
}

/**
 * PATCH /api/motores/slides/:id
 *
 * @param motorResultId  - The ID of the motores_results row
 * @param slides         - The updated slides array
 * @returns The updated motor result with quality scores
 */
export async function patchSlides(
  motorResultId: number,
  slides: SlidesOutput,
): Promise<PatchSlidesResponse> {
  const response = await client.patch<PatchSlidesResponse>(
    `/motores/slides/${motorResultId}`,
    { slides },
  );
  return response.data;
}

/**
 * Fetch the latest motor result ID for a given motor type.
 * Used when we have slides but no resultId (e.g., loaded from localStorage).
 */
export async function fetchLatestSlidesResultId(): Promise<number | null> {
  try {
    // The history endpoint returns { data: MotorHistoryEntry[], total, page, limit }
    const response = await client.get('/motores/history', {
      params: { motor_type: 'slides', limit: 1 },
    });
    const entries = response.data.data as Array<{ id: number }> | undefined;
    return entries?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Regenerate single slide ─────────────────────────────────────────────────

interface RegenerateSlideResponse {
  slide: {
    numero: number;
    tipo: 'portada' | 'objetivos' | 'concepto' | 'pausa' | 'cierre';
    titulo: string;
    texto_pantalla: string | null;
    guion_docente: string | null;
    prompt_imagen: string | null;
    prompt_imagen_variations?: Array<{
      estilo: string;
      prompt: string;
      herramienta_recomendada: string;
    }>;
    alt_text?: string | null;
    callout?: string | null;
  };
  quality: {
    overall: number;
    flags: unknown[];
    suggestions: string[];
  };
  slide_index: number;
}

/**
 * POST /api/motores/slides/:id/regenerate-slide
 *
 * Regenerates a single slide using the MiniMax LLM with teacher feedback.
 *
 * @param motorResultId  - The ID of the motor_results row
 * @param slideIndex     - 0-based index of the slide to regenerate
 * @param feedback      - Teacher feedback (e.g., "más simple con ejemplo del quebracho")
 * @param currentSlide   - The current slide object
 * @returns The new regenerated slide + updated quality score
 */
export async function regenerateSlide(
  motorResultId: number,
  slideIndex: number,
  feedback: string,
  currentSlide: Record<string, unknown>,
): Promise<RegenerateSlideResponse> {
  const response = await client.post<RegenerateSlideResponse>(
    `/motores/slides/${motorResultId}/regenerate-slide`,
    {
      slide_index: slideIndex,
      feedback,
      current_slide: currentSlide,
    },
  );
  return response.data;
}
