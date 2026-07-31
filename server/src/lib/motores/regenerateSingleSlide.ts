/**
 * regenerateSingleSlide — regenerates ONE slide from a motor_results deck.
 *
 * Used when a teacher wants to improve a single slide without regenerating
 * the entire deck. Calls MiniMax LLM with a focused delta prompt, then
 * updates motor_results.output[slideIndex] and recomputes quality.
 */

import { dbGet, dbRun } from '../../db/schema.js';
import { detectIndigenousContext, culturalPrefix } from '../cultural/sensitivity.js';
import { checkQuality } from '../quality/checker.js';
import { SlidesSchema } from '../../schemas/slides.schema.js';

// ─── MiniMax LLM integration ──────────────────────────────────────────────────

const MINIMAX_API_URL = 'https://api.minimax.io/v1/chat/completions';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_MODEL = process.env.MINIMAX_API_KEY ? (process.env.MINIMAX_MODEL || 'MiniMax-M2.7') : 'MiniMax-M2.7';
const MINIMAX_TIMEOUT_MS = 120_000; // 2 min for single slide regeneration

interface LLMResponse {
  numero: number;
  tipo: 'portada' | 'objetivos' | 'concepto' | 'pausa' | 'cierre';
  titulo: string;
  texto_pantalla: string | null;
  guion_docente: string | null;
  prompt_imagen: string | null;
  prompt_imagen_variations?: Array<{
    estilo: 'ilustracion_infantil' | 'documental_educativo' | 'artistico_cultural' | 'diagrama_visual';
    prompt: string;
    herramienta_recomendada: 'bing' | 'leonardo' | 'ideogram' | 'cualquiera';
  }>;
  alt_text?: string | null;
  callout?: string | null;
}

/**
 * Calls MiniMax LLM to regenerate a single slide.
 * Falls back to a mock response if API is unavailable or times out.
 */
async function callLLMForSlide(prompt: string, temperature = 0.7): Promise<LLMResponse> {
  if (!MINIMAX_API_KEY) {
    console.warn('[regenerateSingleSlide] MINIMAX_API_KEY not configured, using mock');
    return generateMockSlide();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[regenerateSingleSlide] MiniMax timeout, aborting');
    controller.abort();
  }, MINIMAX_TIMEOUT_MS);

  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MINIMAX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[regenerateSingleSlide] MiniMax error status: ${response.status}`);
      return generateMockSlide();
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message: string } };

    if (data.error) {
      console.warn('[regenerateSingleSlide] MiniMax error:', data.error.message);
      return generateMockSlide();
    }

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      console.warn('[regenerateSingleSlide] Empty response from MiniMax');
      return generateMockSlide();
    }

    return parseLLMResponse(raw);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[regenerateSingleSlide] MiniMax request aborted (timeout)');
    } else {
      console.warn('[regenerateSingleSlide] LLM call failed:', String(err));
    }
    return generateMockSlide();
  }
}

/** Strips markdown code fences and parses LLM JSON output */
function parseLLMResponse(raw: string): LLMResponse {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned) as LLMResponse;
    // Validate required fields
    if (!parsed.titulo || !parsed.tipo) {
      throw new Error('Missing required fields: titulo or tipo');
    }
    return parsed;
  } catch (parseErr) {
    console.warn('[regenerateSingleSlide] JSON parse failed:', String(parseErr), 'Raw:', cleaned.slice(0, 200));
    return generateMockSlide();
  }
}

/** Mock slide returned when LLM is unavailable */
function generateMockSlide(): LLMResponse {
  return {
    numero: 1,
    tipo: 'concepto',
    titulo: 'Slide regenerada (mock)',
    texto_pantalla: 'Contenido de ejemplo generado automáticamente',
    guion_docente: 'Explica el contenido con tus propias palabras',
    prompt_imagen: 'educational illustration style',
  };
}

// ─── System prompt for single-slide regeneration ───────────────────────────────

const SYSTEM_PROMPT = `Eres un asistente educativo especializado en generar diapositivas para docentes bolivianos de primaria (5-10 años).

Devuelve SOLO el JSON de UNA diapositiva, sin texto adicional, sin markdown.

Schema JSON:
{
  "numero": number,
  "tipo": "portada" | "objetivos" | "concepto" | "pausa" | "cierre",
  "titulo": string (max 60 chars),
  "texto_pantalla": string (max 150 chars, conciso y visible en pantalla),
  "guion_docente": string (max 200 chars, lo que dirá el docente al explicar),
  "prompt_imagen": string (inglés, estilo ilustración infantil, sin figuras humanas, contexto cultural apropiado),
  "prompt_imagen_variations": array de 3 variaciones con estilos: ilustracion_infantil, documental_educativo, artistico_cultural
}

Reglas:
- Limita texto_pantalla a 150 caracteres max
- Limita guion_docente a 200 caracteres max
- prompt_imagen debe estar en INGLÉS, max 200 caracteres
- NO incluyas nombres propios de personas en prompt_imagen
- Mantén el tipo de slide indicado
- Output SOLO el JSON, sin markdown code fences`;

// ─── Main export ─────────────────────────────────────────────────────────────

export interface RegenerateParams {
  motorResultId: number;
  slideIndex: number;
  feedback: string;
  currentSlide: Record<string, unknown>;
  userId: number;
}

export interface RegenerateResult {
  slide: LLMResponse;
  quality: { overall: number; flags: unknown[]; suggestions: string[] };
  slide_index: number;
}

/**
 * Regenerates a single slide at slideIndex within motorResultId.
 * Builds a focused delta prompt, calls MiniMax, validates, persists, recomputes quality.
 */
export async function regenerateSingleSlide(params: RegenerateParams): Promise<RegenerateResult> {
  const { motorResultId, slideIndex, feedback, currentSlide, userId: _userId } = params;

  // 1. Load the motor_results row
  const row = await dbGet(
    'SELECT id, user_id, result_json FROM motor_results WHERE id = $1',
    [motorResultId],
  ) as { id: number; user_id: number; result_json: string } | undefined;

  if (!row) {
    throw new Error('Motor result not found');
  }

  // 2. Parse existing result_json
  let resultJson: Record<string, unknown>;
  try {
    resultJson = JSON.parse(row.result_json);
  } catch {
    throw new Error('Invalid result_json in motor_results');
  }

  // 3. Extract tema + params for cultural context
  const tema = (resultJson.tema as string) || (resultJson.tema_clase as string) || 'el tema de la clase';
  const paramsForCultural = {
    tema_clase: tema,
    full_text: JSON.stringify(resultJson),
  };
  const indigenousContext = detectIndigenousContext(paramsForCultural);
  const culturalRule = indigenousContext.detected ? culturalPrefix(indigenousContext) : '';

  // 4. Build focused regeneration prompt
  const slideType = (currentSlide.tipo as string) || 'concepto';
  const slideTitle = (currentSlide.titulo as string) || '';
  const slideTexto = (currentSlide.texto_pantalla as string) || '';
  const slideGuion = (currentSlide.guion_docente as string) || '';
  const slidePromptImg = (currentSlide.prompt_imagen as string) || '';

  const userPrompt = buildRegenerationPrompt({
    tema,
    culturalRule,
    slideType,
    slideTitle,
    slideTexto,
    slideGuion,
    slidePromptImg,
    feedback,
    slideIndex,
  });

  // 5. Call LLM
  console.log('[regenerateSingleSlide] Calling LLM for slide', slideIndex, 'with feedback:', feedback);
  const newSlide = await callLLMForSlide(userPrompt, 0.7);

  // 6. Validate against slides schema (as a single-element array)
  try {
    const validated = SlidesSchema.parse([newSlide]);
    newSlide.numero = slideIndex + 1; // Ensure correct number
    Object.assign(newSlide, validated[0]);
  } catch (zodErr) {
    console.warn('[regenerateSingleSlide] Schema validation failed, using LLM output as-is:', zodErr);
    // Still use the slide — quality checker will flag issues
    newSlide.numero = slideIndex + 1;
  }

  // 7. Update motor_results.output[slideIndex]
  const slides = (resultJson.output as LLMResponse[] | undefined) || [];
  if (slideIndex < 0 || slideIndex >= slides.length) {
    throw new Error(`Slide index ${slideIndex} out of bounds (0-${slides.length - 1})`);
  }
  slides[slideIndex] = newSlide;

  // 8. Recompute quality on the full deck
  const quality = checkQuality('slides', slides, {});

  // 9. Persist updated result_json
  const updatedPayload = {
    ...resultJson,
    output: slides,
    quality,
  };

  await dbRun(
    'UPDATE motor_results SET result_json = $1 WHERE id = $2',
    [JSON.stringify(updatedPayload), motorResultId],
  );

  return {
    slide: newSlide,
    quality,
    slide_index: slideIndex,
  };
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

interface RegenerationPromptParams {
  tema: string;
  culturalRule: string;
  slideType: string;
  slideTitle: string;
  slideTexto: string;
  slideGuion: string;
  slidePromptImg: string;
  feedback: string;
  slideIndex: number;
}

function buildRegenerationPrompt(p: RegenerationPromptParams): string {
  return `Eres un docente experto regenerando UNA sola diapositiva educativa.

TEMA DE LA CLASE: ${p.tema}
${p.culturalRule ? `\n${p.culturalRule}\n` : ''}

SLIDE ACTUAL (reemplazar):
- Tipo: ${p.slideType}
- Título: ${p.slideTitle}
- Texto en pantalla: ${p.slideTexto}
- Guion del docente: ${p.slideGuion}
- Prompt de imagen: ${p.slidePromptImg}

FEEDBACK DEL DOCENTE: ${p.feedback}

Instructions:
- Mantén el tipo: ${p.slideType}
- Devuelve SOLO el JSON de esta slide, no todo el deck
- El campo "numero" debe ser ${p.slideIndex + 1}
- texto_pantalla max 150 caracteres
- guion_docente max 200 caracteres
- prompt_imagen en INGLÉS, sin nombres de personas
- Incluye prompt_imagen_variations con 3 estilos diferentes
- Output SOLO el JSON, sin markdown code fences`;
}
