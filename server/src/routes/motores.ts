import { Router } from 'express';
import type { Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';
import { motorLimiterHourly, motorLimiterDaily } from '../middleware/rateLimiter.js';
import { dbAll, dbGet, dbRun } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { validateAlpha2 } from '../schemas/alpha2.schema.js';
import { validateSynthesis } from '../schemas/synthesis.schema.js';
import { validateABP } from '../schemas/abp.schema.js';
import { validateAssessment } from '../schemas/assessment.schema.js';
import { validatePlan } from '../schemas/plan.schema.js';
import { validateSlides } from '../schemas/slides.schema.js';
import { validateFicha } from '../schemas/ficha.schema.js';
import { validateQuiz } from '../schemas/quiz.schema.js';
import { validateTutor } from '../schemas/tutor.schema.js';
import { validatePDC } from '../schemas/pdc.schema.js';
import { validateRecalibrate } from '../schemas/recalibrate.schema.js';
import { validateMicro } from '../schemas/micro.schema.js';
import { validateSourceNarrator, type SourceNarratorOutput } from '../schemas/source-narrator.schema.js';
import { validateSourceFidelity, type FidelityReport } from '../lib/source-grounding.js';
import { checkQuality, type QualityScore } from '../lib/quality/checker.js';
import { generateMockOutput } from '../motores/mocks.js';
import type { MotorType } from '../motores/mocks.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { setMotorState } from '../db/motorState.js';
import { detectIndigenousContext, culturalPrefix } from '../lib/cultural/sensitivity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, '../motores/prompts');

// ── Prompt file mapping ──
// src/prompts/Motor_M0a.md              →  synthesis
// src/prompts/Motor_M0b.md              →  abp
// src/prompts/Motor_M0c.md              →  assessment
// src/prompts/Motor_M1a.md              →  plan
// src/prompts/Motor_M1b.md              →  slides
// src/prompts/Motor_M1c.md              →  ficha
// src/prompts/Motor_M2a.md              →  quiz
// src/prompts/Motor_M2b.md              →  tutor
// src/prompts/Motor_PDC_Trimestral.md   →  pdc
// src/prompts/Motor_Recalibracion.md    →  recalibrate
// src/prompts/Motor_MicroObjetivos.md   →  micro
// src/prompts/Motor_Alpha-2.md          →  alpha2
//
// Copied to: server/src/motores/prompts/<motortype>.md

interface CachedPrompt { content: string; mtime: number; }
const promptCache = new Map<string, CachedPrompt>();

function getPromptVersion(motorType: string): string {
  try {
    const filePath = path.join(PROMPTS_DIR, `${motorType}.md`);
    return execSync(`git hash-object "${filePath}"`, { encoding: 'utf-8' }).trim().slice(0, 8);
  } catch {
    return 'unknown';
  }
}

function loadSystemPrompt(motorType: string): string {
  const filePath = path.join(PROMPTS_DIR, `${motorType}.md`);
  try {
    const stat = fs.statSync(filePath);
    const mtime = stat.mtimeMs;
    const cached = promptCache.get(motorType);
    if (cached && cached.mtime === mtime) return cached.content;
    const content = fs.readFileSync(filePath, 'utf-8');
    promptCache.set(motorType, { content, mtime });
    return content;
  } catch {
    console.warn(`[motores] Prompt file not found for ${motorType}, using fallback`);
    const fallback = `Eres un asistente pedagógico especializado en ${motorType}. Genera JSON estructurado.`;
    promptCache.set(motorType, { content: fallback, mtime: 0 });
    return fallback;
  }
}

/**
 * Extraction layer for source_narrator motor.
 * Maps LLM output (Spanish field names) to the Zod schema (English field names).
 */
function extractSourceNarrator(llmOutput: any): SourceNarratorOutput {
  // If LLM already returned the correct schema fields, use them directly.
  if (llmOutput.narrative_summary && Array.isArray(llmOutput.characters)) {
    return {
      narrative_summary: llmOutput.narrative_summary,
      characters: llmOutput.characters,
      sequence: Array.isArray(llmOutput.sequence) && llmOutput.sequence.length > 0
        ? llmOutput.sequence
        : [{ order: 1, event: llmOutput.narrative_summary.slice(0, 100), significance: 'Event from the source narrative' }],
      examples: llmOutput.examples || [],
      cultural_anchors: llmOutput.cultural_anchors || [],
      vivid_details: llmOutput.vivid_details || [],
    };
  }

  // Legacy fallback: map old field names to schema
  const NarrativeSummary = (() => {
    const raw = llmOutput.resumen_narrativo || llmOutput.resumen || llmOutput.narrative_summary || '';
    return raw.length > 800 ? raw.slice(0, 800) : raw;
  })();

  const characters = (llmOutput.personajes || []).map((p: any) => ({
    name: p.nombre || '',
    role: p.rol || '',
    description: p.descripcion || '',
  }));

  const sequence: { order: number; event: string; significance: string }[] = [];
  const elementosNarrativos = llmOutput.elementos_narrativos || {};
  const narrativeEvents = [
    elementosNarrativos.inicio,
    elementosNarrativos.nudo,
    elementosNarrativos.desenlace,
  ];
  narrativeEvents.forEach((event: string | undefined, idx: number) => {
    if (event) {
      sequence.push({
        order: idx + 1,
        event,
        significance: 'Event from the source narrative',
      });
    }
  });

  const examples: { type: 'cultural'; content: string; source_quote?: string }[] = [];
  const animales = llmOutput.animales_mencionados || [];
  animales.forEach((a: any) => {
    if (a.nombre) {
      examples.push({
        type: 'cultural',
        content: a.funcion_narrativa || `${a.nombre} — ${a.color_asignado || 'no description'}`,
      });
    }
  });

  const culturalAnchors: { term: string; definition: string; context: string }[] = [];
  if (llmOutput.contexto_cultural) {
    culturalAnchors.push({
      term: llmOutput.tema || 'Cultural Context',
      definition: llmOutput.contexto_cultural,
      context: 'Mentioned in the source text',
    });
  }

  const vividDetails: string[] = [];
  if (Array.isArray(llmOutput.palabras_clave_analizadas)) {
    vividDetails.push(...llmOutput.palabras_clave_analizadas);
  }

  return {
    narrative_summary: NarrativeSummary,
    characters,
    sequence: sequence.length > 0 ? sequence : [{ order: 1, event: NarrativeSummary.slice(0, 100), significance: 'Event from the source narrative' }],
    examples: examples.length > 0 ? examples : [],
    cultural_anchors: culturalAnchors,
    vivid_details: vividDetails,
  };
}

// ???????????????????????? MiniMax API integration ??????????????????????????
const MINIMAX_API_URL = 'https://api.minimax.io/v1/chat/completions';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';

// P0 FIX: AbortController timeout for MiniMax API calls.
// Without this, a slow/hanging MiniMax API would block the route handler forever,
// preventing mock fallback from triggering and leaving motor state stuck at 'generating'.
// Slides motor uses longer timeout due to larger output (8192 tokens) + 10 complex slides.
const MINIMAX_TIMEOUT_MS = (motorType: string): number =>
  motorType === 'slides' ? 240_000 : 60_000;

const MOTOR_TEMPS: Record<string, number> = {
  synthesis: 0.7,
  abp: 0.8,
  assessment: 0.3,
  plan: 0.4,
  slides: 0.5,
  ficha: 0.6,
  quiz: 0.4,
  tutor: 0.3,
  pdc: 0.3,
  recalibrate: 0.3,
  micro: 0.3,
  alpha2: 0.2,
  source_narrator: 0.6,
};

interface MinimaxChoice {
  finish_reason?: string;
  message?: { role?: string; content?: string };
}

interface MinimaxResponse {
  choices?: MinimaxChoice[];
  error?: { message: string };
}

/**
 * Llama a la API de MiniMax para cualquier tipo de motor.
 * Si falla, retorna null para que se use el fallback simulado.
 */
async function tryMinimax(
  motorType: string,
  params: Record<string, unknown>
): Promise<unknown | null> {
  if (!MINIMAX_API_KEY) {
    console.warn('[motores] MINIMAX_API_KEY no configurada');
    return null;
  }
  const paramsJson = JSON.stringify(params, null, 2);
  const systemPrompt = loadSystemPrompt(motorType);

  // ── Cultural sensitivity injection ──
  const indigenousContext = detectIndigenousContext(params as Record<string, unknown>);
  if (indigenousContext.detected) {
    console.log('[cultural] detected:', indigenousContext.groups.join(', '));
  }
  const culturalRule = indigenousContext.detected ? culturalPrefix(indigenousContext) : '';
  const userMessage = [
    culturalRule,
    'Variables de entrada:',
    paramsJson,
    '',
    'Genera la salida en JSON según el OUTPUT SCHEMA del prompt de sistema.',
    'Responde ÚNICAMENTE con el JSON, sin markdown ni texto adicional.',
  ].filter(Boolean).join('\n\n');
  const body = {
    model: MINIMAX_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: MOTOR_TEMPS[motorType] ?? 0.3,
    // Slides motor generates more output per slide (3 image variations + alt_text).
    // Use 8192 for slides to avoid truncation; default 4096 for others.
    max_tokens: motorType === 'slides' ? 8192 : 4096,
    response_format: { type: 'json_object' },
  };
  const timeoutMs = MINIMAX_TIMEOUT_MS(motorType);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[motores] MiniMax ${motorType} timeout after ${timeoutMs}ms, aborting`);
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MINIMAX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn('[motores] MiniMax error status:', response.status);
      return null;
    }
    const data = await response.json();
    if (data.error) {
      console.warn('[motores] MiniMax error:', data.error.message);
      return null;
    }
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      console.warn('[motores] MiniMax respuesta vacía');
      return null;
    }
    console.log('[motores] RAW LLM OUTPUT (length:', raw.length, '):');
    console.log(raw.slice(0, 2000));
    console.log('[motores] RAW LLM OUTPUT END');
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
    // Cut off any trailing text after the last closing brace/bracket
    // Some MiniMax responses include epilogues like "Nota: ..." after the JSON
    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (lastBrace > 0 && lastBrace < cleaned.length - 1) {
      const trailing = cleaned.slice(lastBrace + 1);
      // Only strip if there's non-whitespace content after the brace
      if (trailing.trim().length > 0) {
        console.warn('[motores] Stripping trailing text after JSON:', trailing.substring(0, 80));
        cleaned = cleaned.slice(0, lastBrace + 1);
      }
    }
    console.log('[motores] CLEANED string before parse (length:', cleaned.length, '):');
    console.log(cleaned.slice(0, 2000));
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('[motores] JSON.parse failed:', String(parseErr));
      console.warn('[motores] Failed cleaned string was:', cleaned.slice(0, 500));
      return null;
    }
    console.log('[motores] PARSED object type:', typeof parsed, 'isArray:', Array.isArray(parsed));
    if (typeof parsed === 'object' && parsed !== null) {
      console.log('[motores] PARSED keys:', Object.keys(parsed));
    }
    // Wire-in extraction layer for source_narrator
    if (motorType === 'source_narrator') {
      console.log('[motores] Applying extraction layer for source_narrator');
      try {
        return extractSourceNarrator(parsed);
      } catch (extractErr: any) {
        console.warn('[motores] Extraction failed:', extractErr.message);
        console.warn('[motores] Falling back to raw LLM output');
      }
    }
    return parsed;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`[motores] MiniMax ${motorType} aborted (timeout ${timeoutMs}ms), falling back to mock`);
    } else {
      console.warn('[motores] MiniMax fetch falló:', String(err));
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * MiniMax streaming variant — reads SSE from MiniMax and returns accumulated text + JSON
 */
async function tryMinimaxStream(
  motorType: string,
  params: Record<string, unknown>,
  clientSignal?: AbortSignal
): Promise<{ chunks: string[]; output: unknown } | null> {
  if (!MINIMAX_API_KEY) {
    console.warn('[motores] MINIMAX_API_KEY no configurada');
    return null;
  }

  const paramsJson = JSON.stringify(params, null, 2);
  const systemPrompt = loadSystemPrompt(motorType);
  const userMessage = [
    'Variables de entrada:',
    paramsJson,
    '',
    'Genera la salida en JSON según el OUTPUT SCHEMA del prompt de sistema.',
    'Responde ÚNICAMENTE con el JSON, sin markdown ni texto adicional.',
  ].join('\n');

  const body = {
    model: MINIMAX_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: MOTOR_TEMPS[motorType] ?? 0.3,
    max_tokens: 4096,
    stream: true,
  };

  const streamTimeoutMs = MINIMAX_TIMEOUT_MS(motorType);
  const streamController = new AbortController();
  const streamTimeoutId = setTimeout(() => {
    console.warn(`[motores] MiniMax stream ${motorType} timeout after ${streamTimeoutMs}ms, aborting`);
    streamController.abort();
  }, streamTimeoutMs);

  // Combine client disconnect signal with internal timeout signal
  const combinedSignal = clientSignal
    ? AbortSignal.any([clientSignal, streamController.signal])
    : streamController.signal;

  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MINIMAX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });

    if (!response.ok) {
      console.warn('[motores] MiniMax stream error:', response.status);
      return null;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              const cleaned = content.replace(/<[^>]+>/g, '').trim();
              if (cleaned) {
                chunks.push(cleaned);
                fullContent += cleaned;
              }
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }

    if (!fullContent.trim()) {
      console.warn('[motores] MiniMax stream vacía');
      return null;
    }

    // Strip thinking blocks and code fences, then parse JSON
    let cleaned = fullContent.trim();
    cleaned = cleaned.replace(/<[^>]+>/g, '').trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
    // Handle both objects { ... } and arrays [ ... ]
    let parsed: unknown;
    if (cleaned.startsWith('[')) {
      // Find matching array brackets
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start < 0 || end <= start) return null;
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } else {
      // Find matching object braces
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start < 0 || end <= start) return null;
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    }

    return { chunks, output: parsed };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`[motores] MiniMax stream ${motorType} aborted (timeout ${streamTimeoutMs}ms), falling back to mock`);
    } else {
      console.warn('[motores] MiniMax stream fetch falló:', String(err));
    }
    return null;
  } finally {
    clearTimeout(streamTimeoutId);
  }
}

const router = Router();
router.use(authMiddleware);

function translateZodMessage(msg: string): string {
  if (/expected (string|text),? received undefined/i.test(msg)) return 'falta un texto requerido';
  if (/expected number,? received undefined/i.test(msg)) return 'falta un valor numérico';
  if (/expected array,? received object/i.test(msg)) return 'formato inesperado en la lista';
  if (/expected array,? received undefined/i.test(msg)) return 'falta una lista';
  if (/received undefined/i.test(msg)) return 'valor no proporcionado';
  if (/string must be at least \d+ characters/i.test(msg)) return 'texto muy corto';
  if (/string must be at most \d+ characters/i.test(msg)) return 'texto muy largo';
  if (/number must be/i.test(msg)) return 'valor numérico fuera de rango';
  if (/expected (boolean|true|false),? received/i.test(msg)) return 'valor lógico esperado';
  if (/expected object,? received/i.test(msg)) return 'formato inesperado';
  return msg;
}

// ─── Motor route handlers ────────────────────────────────────────────

// Common typo auto-fix — applied after LLM validation to catch generated errors
const COMMON_TYPOS: Record<string, string> = {
  'secciónes': 'secciones',
  'secciónón': 'sección',
  'transversalas': 'transversales',
  'objetivos transversalas': 'objetivos transversales',
  'comprensionas': 'comprensiones',
  'niñoss': 'niños',
  'estudiantees': 'estudiantes',
  // Estilo normalization (slides.md v3.3 enum alignment)
  'fotografia_educativa': 'documental_educativo',
  // P1-5: Known LLM Spanish typos
  'solcalienta': 'sol calienta',
  'sol calienta al': 'sol calienta al',
};

function applyTypoFix(obj: unknown): unknown {
  let str = JSON.stringify(obj);
  let fixed = false;
  for (const [typo, fix] of Object.entries(COMMON_TYPOS)) {
    if (str.includes(typo)) {
      console.warn(`[motores] Auto-fixing typo: "${typo}" → "${fix}"`);
      str = str.replaceAll(typo, fix);
      fixed = true;
    }
  }

  // P1-5: Remove Chinese/CJK characters from all text fields
  const cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
  if (cjkPattern.test(str)) {
    console.warn('[motores] Removing CJK (Chinese) characters from output');
    str = str.replace(cjkPattern, '');
    fixed = true;
  }

  // P1-5: Fix run-on words — lowercase letter directly followed by uppercase (camelCase artifacts)
  const runOnPattern = /([a-zñáéíóú])([A-ZÑÁÉÍÓÚ])/g;
  if (runOnPattern.test(str)) {
    console.warn('[motores] Fixing run-on words (camelCase artifacts)');
    str = str.replace(runOnPattern, '$1 $2');
    fixed = true;
  }

  return fixed ? JSON.parse(str) : obj;
}

/**
 * Normalize estilo values in slides output — safety net for enum drift.
 * MiniMax may return variations like "Documental_Educativo" or "diagrama-visual"
 * that don't match the exact schema enum. Maps them to the closest valid value.
 */
function normalizeEstilosEnSlides(obj: unknown): unknown {
  const VALID_ESTILOS = new Set([
    'ilustracion_infantil',
    'documental_educativo',
    'artistico_cultural',
    'diagrama_visual',
  ]);

  function normalizeValue(v: string): string {
    const lower = v.toLowerCase().trim();
    if (VALID_ESTILOS.has(lower)) return lower;
    // Common variations from MiniMax output
    if (lower.includes('docu') || lower.includes('edu') || lower === 'fotografia_educativa') return 'documental_educativo';
    if (lower.includes('diagra') || lower.includes('diagram') || lower.includes('visual')) return 'diagrama_visual';
    if (lower.includes('ilustra') || lower.includes('infantil') || lower.includes('child')) return 'ilustracion_infantil';
    if (lower.includes('artis') || lower.includes('cult') || lower.includes('cultural')) return 'artistico_cultural';
    return 'ilustracion_infantil'; // safe default
  }

  function walk(o: unknown): unknown {
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === 'object') {
      const obj = o as Record<string, unknown>;
      // If this looks like a slide with prompt_imagen_variations, normalize estilos
      if ('prompt_imagen_variations' in obj && Array.isArray(obj.prompt_imagen_variations)) {
        obj.prompt_imagen_variations = (obj.prompt_imagen_variations as Array<Record<string, unknown>>).map((variation) => {
          if ('estilo' in variation && typeof variation.estilo === 'string') {
            const normalized = normalizeValue(variation.estilo);
            if (normalized !== variation.estilo) {
              console.warn(`[motores] Normalizing estilo: "${variation.estilo}" → "${normalized}"`);
            }
            return { ...variation, estilo: normalized };
          }
          return variation;
        });
      }
      // Recurse into all keys
      for (const key of Object.keys(obj)) {
        obj[key] = walk(obj[key]);
      }
    }
    return o;
  }

  return walk(obj);
}

const VALIDATORS: Record<string, (data: unknown) => any> = {
  alpha2: validateAlpha2,
  synthesis: validateSynthesis,
  abp: validateABP,
  assessment: validateAssessment,
  plan: validatePlan,
  slides: validateSlides,
  ficha: validateFicha,
  quiz: validateQuiz,
  tutor: validateTutor,
  pdc: validatePDC,
  recalibrate: validateRecalibrate,
  micro: validateMicro,
  source_narrator: validateSourceNarrator,
};

// GET /api/motores/history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const motorType = typeof req.query.motor_type === 'string' && req.query.motor_type ? req.query.motor_type : null;
    const offset = (page - 1) * limit;

    let query = `SELECT
      id, motor_type, status, simulated, created_at,
      LEFT(result_json, 2000) AS result_json_preview,
      CASE
        WHEN result_json LIKE '%"score":%'
        THEN CAST(SUBSTRING(result_json FROM '"score"[[:space:]]*:[[:space:]]*([0-9]+)') AS INTEGER)
        ELSE NULL
      END AS fidelity_score
    FROM motor_results WHERE user_id = $1`;
    const params: any[] = [req.user!.id];

    if (motorType) {
      params.push(motorType);
      query += ` AND motor_type = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const results = await dbAll(query, params);

    // Total count query
    let countQuery = 'SELECT COUNT(*) FROM motor_results WHERE user_id = $1';
    const countParams: any[] = [req.user!.id];
    if (motorType) {
      countParams.push(motorType);
      countQuery += ` AND motor_type = $${countParams.length}`;
    }
    const countResult = await dbAll(countQuery, countParams);
    const total = parseInt(countResult[0]?.count || '0');

    res.json({ data: results, total, page, limit });
  } catch (err) {
      res.status(500).json({ error: 'Error al cargar historial' });
  }
});

// Apply rate limiter to POST /:type
router.post('/:type', motorLimiterHourly, motorLimiterDaily, async (req: AuthRequest, res: Response) => {
  const type = req.params.type as string;
  const validator = VALIDATORS[type];

  if (!validator) {
    return res.status(400).json({ error: `Motor desconocido: ${type}` });
  }

  const { params = {}, curriculum_id } = req.body || {};

  try {
    setMotorState(req.user!.id, type, 'generating');
    // Intentar MiniMax para todos los motores; fallback a simulado
    const minimaxResult = await tryMinimax(type, params as Record<string, unknown>);
    const rawOutput = minimaxResult ?? generateMockOutput(type as MotorType, params as Record<string, unknown>);
    const isSimulated = minimaxResult === null;
    if (minimaxResult) {
      console.log('[motores] MiniMax', type, 'exitoso');
    }

    // Normalize estilo enum values before validation (slides enum alignment)
    let normalizedOutput = type === 'slides' ? normalizeEstilosEnSlides(rawOutput) : rawOutput;
    // MiniMax slides motor now returns {slides: [...} wrapper — unwrap for validator that expects raw array
    if (type === 'slides' && normalizedOutput && typeof normalizedOutput === 'object' && !Array.isArray(normalizedOutput) && 'slides' in normalizedOutput && Array.isArray((normalizedOutput as Record<string, unknown>).slides)) {
      normalizedOutput = (normalizedOutput as Record<string, unknown>).slides as unknown;
      console.log('[motores] Unwrapped {slides: [...]} wrapper for validation');
    }

    // Validate the output
    let validated;
    try {
        validated = validator(normalizedOutput);
    } catch (validationErr: any) {
        console.error('[motores] Validation failed for', type);
        console.error('[motores] Raw output type:', typeof rawOutput);
        console.error('[motores] Is array:', Array.isArray(rawOutput));
        console.error('[motores] Raw output keys:', rawOutput && typeof rawOutput === 'object' ? Object.keys(rawOutput) : 'N/A');
        console.error('[motores] Raw output:', JSON.stringify(rawOutput).slice(0, 2000));
        console.error('[motores] Error:', validationErr.message);
        throw validationErr;
    }

    // Auto-fix common LLM-generated typos before returning to client
    validated = applyTypoFix(validated);

    // Quality scoring: pure function, no blocking, just flags for wizard UI
    const quality: QualityScore = checkQuality(type, validated, params as Record<string, unknown>);
    if (quality.flags.length > 0) {
      console.log(`[quality] ${type}: score=${quality.overall}, flags=${quality.flags.length}`);
    }

    // Cultural sensitivity detection — inject into response for frontend indicator
    const indigenousContext = detectIndigenousContext(params as Record<string, unknown>);
    const cultural = {
      detected: indigenousContext.detected,
      groups: indigenousContext.groups,
      regions: indigenousContext.regions,
    };

    // Placeholder detection for Síntesis motor
    if (type === 'synthesis') {
      const resultStr = JSON.stringify(validated);
      if (resultStr.includes('Tema de ejemplo')) {
        console.warn('[synthesis] ⚠️ Output contains placeholder text — input topics were:', JSON.stringify((params as Record<string, unknown>).temas));
      }
    }

    // Store in DB (always insert, using NULL when curriculum_id is falsy)
    const promptVersion = getPromptVersion(type);

    // Source-grounding fidelity check (post-generation)
    // Detects content in the output that is NOT grounded in full_text.
    // Does NOT reject — just flags for human review.
    let fidelityReport: FidelityReport | null = null;
    const fullText = (params as Record<string, unknown>).full_text;
    if (typeof fullText === 'string' && fullText.length >= 10) {
      const motorTypeForFidelity = type === 'source_narrator' ? 'narrator' : type;
      try {
        fidelityReport = validateSourceFidelity(validated, fullText, { type: motorTypeForFidelity as any });
        if (fidelityReport.total_flags > 0) {
          console.log(`[fidelity] ${type}: score=${fidelityReport.score}, flags=${fidelityReport.total_flags}`);
        }
      } catch (fidelityErr: any) {
        console.warn(`[fidelity] ${type}: check failed, continuing without fidelity: ${fidelityErr.message}`);
        fidelityReport = null;
      }
    }

    // Wrap validated + fidelity + quality in a single JSON object so they persist with the result.
    // Place fidelity FIRST so it's not truncated by LEFT(result_json, 2000) in history queries.
    const storedPayload = fidelityReport
      ? { fidelity: fidelityReport, quality, output: validated }
      : { quality, output: validated };

    let motorResultId: number | undefined;
    try {
      const info = await dbRun(
        'INSERT INTO motor_results (user_id, curriculum_id, motor_type, result_json, status, simulated, prompt_version) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [req.user!.id, curriculum_id || null, type, JSON.stringify(storedPayload), 'done', isSimulated, promptVersion]
      );
      motorResultId = info.id;
    } catch (dbErr: any) {
      console.error(`[motores] DB insert failed for ${type}:`, dbErr.message);
      // Still return the result to the client even if DB logging failed
    }

    setMotorState(req.user!.id, type, 'done');
    res.json({
      data: {
        jobId: uuidv4(),
        status: 'done',
        output: validated,
        simulated: isSimulated,
        fidelity: fidelityReport || undefined,
        quality: quality,
        cultural: cultural,
        motor_result_id: motorResultId,
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fieldLabels: Record<string, string> = {
        temas_desarrollados: 'temas desarrollados',
        conceptos_clave: 'conceptos clave',
        inteligencias_sugeridas: 'inteligencias sugeridas',
        actividades: 'actividades',
        objetivo_general: 'objetivo general',
        rubrica: 'rúbrica de evaluación',
        criterios: 'criterios de evaluación',
        niveles: 'niveles de desempeño',
        preguntas: 'preguntas de evaluación',
        tipo: 'tipo de actividad',
        titulo: 'título',
        descripcion: 'descripción',
        duracion: 'duración',
        recursos: 'recursos',
        evaluacion: 'evaluación',
        competencias: 'competencias',
        actividades_previas: 'actividades previas',
        contenidos: 'contenidos',
        secuencia_didactica: 'secuencia didáctica',
        orientaciones: 'orientaciones',
        actividades_refuerzo: 'actividades de refuerzo',
        actividades_ampliacion: 'actividades de ampliación',
        criterios_evaluacion: 'criterios de evaluación',
        instrumentos: 'instrumentos',
        sesiones: 'sesiones',
        materiales: 'materiales',
        procedimiento: 'procedimiento',
      };
      // ZodError.errors is ReadonlyArray<ZodErrorItem> — convert to plain array
      // so JSON serialization preserves all properties (input, path, message)
      const errorItems = Array.from(err.errors);
      const friendlyErrors = errorItems.map((e) => {
        // ZodIssue.input is only present on ZodInvalidTypeIssue — use optional chaining
        const received = 'input' in e ? (e as { input: unknown }).input : undefined;
        return {
          campo: fieldLabels[e.path.join('.')] || e.path.join('.'),
          problema: translateZodMessage(e.message),
          recibido: typeof received === 'object' && received !== null ? 'valor recibido' : `tipo ${typeof received}`,
        };
      });
      res.status(422).json({
        error: 'La estructura del contenido generado no es válida. Intenta con parámetros diferentes.',
        details: friendlyErrors,
      });
    } else {
      console.error('[motores] Non-ZodError in', type, ':', err);
      if (err instanceof Error) {
        console.error('[motores] Stack:', err.stack);
      }
      setMotorState(req.user!.id, type, 'error');
      res.status(500).json({ error: 'Error generando contenido' });
    }
  }
});

// POST /api/motores/:type/stream — SSE streaming variant
router.post('/:type/stream', motorLimiterHourly, motorLimiterDaily, async (req: AuthRequest, res: Response) => {
  const type = req.params.type as string;
  const validator = VALIDATORS[type];
  if (!validator) {
    return res.status(400).json({ error: `Motor desconocido: ${type}` });
  }

  const { params = {}, curriculum_id } = req.body || {};
  setMotorState(req.user!.id, type, 'generating');

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ status: 'started' });

  // Create AbortController for client disconnect — aborts MiniMax call when client disconnects
  const clientAbortController = new AbortController();
  req.on('close', () => {
    if (!clientAbortController.signal.aborted) {
      console.warn(`[motores/stream] Client disconnected for ${type}, aborting MiniMax call`);
      clientAbortController.abort();
    }
  });

  try {
    const result = await tryMinimaxStream(type, params, clientAbortController.signal);
    if (!result) {
      // MiniMax failed — generate mock and stream it
      const mockOutput = generateMockOutput(type as MotorType, params as Record<string, unknown>);
      sendEvent({ status: 'done', output: mockOutput, simulated: true });
      return;
    }

    // Stream accumulated chunks token by token
    for (const chunk of result.chunks) {
      sendEvent({ chunk });
    }

    // Validate and store
    let validated = validator(result.output);
    validated = applyTypoFix(validated);
    const promptVersion = getPromptVersion(type);
    await dbRun(
      'INSERT INTO motor_results (user_id, curriculum_id, motor_type, result_json, status, simulated, prompt_version) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user!.id, curriculum_id || null, type, JSON.stringify(validated), 'done', false, promptVersion]
    );

    setMotorState(req.user!.id, type, 'done');
    sendEvent({ status: 'done', output: validated, simulated: false });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const fieldLabels: Record<string, string> = {
        temas_desarrollados: 'temas desarrollados',
        conceptos_clave: 'conceptos clave',
        inteligencias_sugeridas: 'inteligencias sugeridas',
        actividades: 'actividades',
        objetivo_general: 'objetivo general',
        rubrica: 'rúbrica de evaluación',
        criterios: 'criterios de evaluación',
        niveles: 'niveles de desempeño',
        preguntas: 'preguntas de evaluación',
        tipo: 'tipo de actividad',
        titulo: 'título',
        descripcion: 'descripción',
        duracion: 'duración',
        recursos: 'recursos',
        evaluacion: 'evaluación',
        competencias: 'competencias',
        actividades_previas: 'actividades previas',
        contenidos: 'contenidos',
        secuencia_didactica: 'secuencia didáctica',
        orientaciones: 'orientaciones',
        actividades_refuerzo: 'actividades de refuerzo',
        actividades_ampliacion: 'actividades de ampliación',
        criterios_evaluacion: 'criterios de evaluación',
        instrumentos: 'instrumentos',
        sesiones: 'sesiones',
        materiales: 'materiales',
        procedimiento: 'procedimiento',
      };
      // ZodError.errors is ReadonlyArray<ZodErrorItem> — convert to plain array
      const errorItems = Array.from(err.errors);
      const friendlyErrors = errorItems.map((e) => {
        const received = 'input' in e ? (e as { input: unknown }).input : undefined;
        return {
          campo: fieldLabels[e.path.join('.')] || e.path.join('.'),
          problema: translateZodMessage(e.message),
          recibido: typeof received === 'object' && received !== null ? 'valor recibido' : `tipo ${typeof received}`,
        };
      });
      sendEvent({ status: 'error', error: 'La estructura del contenido generado no es válida.', details: friendlyErrors });
    } else {
      console.error('[motores/stream]', err);
      setMotorState(req.user!.id, type, 'error');
      sendEvent({ status: 'error', error: 'Error generando contenido' });
    }
  }

  res.end();
});

// ─── Motor result persistence ────────────────────────────────────────

const MOTOR_TYPES = [
  'alpha2', 'synthesis', 'abp', 'assessment',
  'plan', 'slides', 'ficha', 'quiz',
  'tutor', 'pdc', 'recalibrate', 'micro',
  'source_narrator',
] as const;

const MotorResultPayload = z.object({
  motor_type: z.enum(MOTOR_TYPES),
  result_json: z.string()
    .refine(
      (s) => s.length <= 5_000_000,
      'El resultado excede el tamaño máximo permitido (5MB)'
    ),
  curriculum_id: z.number().nullable().optional(),
  simulated: z.boolean().default(false),
});

/**
 * POST /api/motores/results
 * Creates a new motor_result entry. Returns { id }.
 * Used by multi-phase editors to persist edited content.
 */
router.post('/results', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = MotorResultPayload.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parsed.error.errors });
    }
    const { motor_type, result_json, curriculum_id, simulated } = parsed.data;
    const info = await dbRun(
      'INSERT INTO motor_results (user_id, curriculum_id, motor_type, result_json, status, simulated) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      [req.user!.id, curriculum_id ?? null, motor_type, result_json, 'done', simulated]
    );
    res.json({ data: { id: info.id } });
  } catch (err) {
    console.error('[motores/results POST]', err);
      res.status(500).json({ error: 'Error al guardar resultado' });
  }
});

/**
 * PUT /api/motores/results/:id
 * Updates result_json on an existing motor_result.
 * Auth: user can only update their own results (or admin).
 */
router.put('/results/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { result_json } = req.body;
  if (result_json === undefined) {
    return res.status(400).json({ error: 'Falta result_json en el body' });
  }
  try {
    // Auth check: verify ownership
    const row = await dbGet(
      'SELECT user_id FROM motor_results WHERE id = $1',
      [id]
    ) as { user_id: number } | undefined;
    if (!row) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    if (row.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await dbRun(
      'UPDATE motor_results SET result_json = $1, created_at = created_at WHERE id = $2',
      [result_json, id]
    );
    res.json({ data: { id: Number(id), updated: true } });
  } catch (err) {
    console.error('[motores/results PUT]', err);
      res.status(500).json({ error: 'Error al actualizar resultado' });
  }
});

/**
 * GET /api/motores/results/:id
 * Retrieves a single motor_result by ID (for loading saved edits).
 */
router.get('/results/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const row = await dbGet(
      'SELECT id, user_id, motor_type, result_json, created_at FROM motor_results WHERE id = $1',
      [id]
    ) as { id: number; user_id: number; motor_type: string; result_json: string; created_at: Date } | undefined;
    if (!row) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    if (row.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    res.json({ data: { id: row.id, motor_type: row.motor_type, result_json: JSON.parse(row.result_json), created_at: row.created_at } });
  } catch (err) {
    console.error('[motores/results GET]', err);
      res.status(500).json({ error: 'Error al cargar resultado' });
  }
});

// Catch-all for legacy /:type/:jobId route — MUST be last to not shadow specific routes
router.get('/:type/:jobId', (req, res) => {
  res.json({ data: { jobId: req.params.jobId, status: 'done', result: {} } });
});

export default router;