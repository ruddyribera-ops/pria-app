import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { motorLimiter } from '../middleware/rateLimiter.js';
import { dbAll, dbRun } from '../db/schema.js';
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
import { generateMockOutput } from '../motores/mocks.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

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

const promptCache = new Map<string, string>();

function getPromptVersion(motorType: string): string {
  try {
    const filePath = path.join(PROMPTS_DIR, `${motorType}.md`);
    return execSync(`git hash-object ${filePath}`, { encoding: 'utf-8' }).trim().slice(0, 8);
  } catch {
    return 'unknown';
  }
}

function loadSystemPrompt(motorType: string): string {
  if (promptCache.has(motorType)) return promptCache.get(motorType)!;
  const filePath = path.join(PROMPTS_DIR, `${motorType}.md`);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    promptCache.set(motorType, content);
    return content;
  } catch {
    console.warn(`[motores] Prompt file not found for ${motorType}, using fallback`);
    const fallback = `Eres un asistente pedagógico especializado en ${motorType}. Genera JSON estructurado.`;
    promptCache.set(motorType, fallback);
    return fallback;
  }
}

// ???????????????????????? MiniMax API integration ??????????????????????????
const MINIMAX_API_URL = 'https://api.minimax.io/v1/chat/completions';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';

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
    response_format: { type: 'json_object' },
  };
  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MINIMAX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[motores] MiniMax fetch falló:', String(err));
    return null;
  }
}

/**
 * MiniMax streaming variant — reads SSE from MiniMax and returns accumulated text + JSON
 */
async function tryMinimaxStream(
  motorType: string,
  params: Record<string, unknown>
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

  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MINIMAX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    return { chunks, output: parsed };
  } catch (err) {
    console.warn('[motores] MiniMax stream fetch falló:', String(err));
    return null;
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
};

// GET /api/motores/history
router.get('/history', authMiddleware, async (req: any, res) => {
  try {
    const results = await dbAll(
      'SELECT id, motor_type, status, simulated, created_at, LEFT(result_json, 2000) AS result_json_preview FROM motor_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ data: results });
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar historial' });
  }
});

// Apply rate limiter to POST /:type
router.post('/:type', motorLimiter, async (req: any, res) => {
  const { type } = req.params;
  const validator = VALIDATORS[type];

  if (!validator) {
    return res.status(400).json({ error: `Motor desconocido: ${type}` });
  }

  const { params = {}, curriculum_id } = req.body || {};

  try {
    // Intentar MiniMax para todos los motores; fallback a simulado
    const minimaxResult = await tryMinimax(type, params);
    const rawOutput = minimaxResult ?? generateMockOutput(type, params);
    const isSimulated = minimaxResult === null;
    if (minimaxResult) {
      console.log('[motores] MiniMax', type, 'exitoso');
    }

    // Validate the output
    const validated = validator(rawOutput);

    // Store in DB (always insert, using NULL when curriculum_id is falsy)
    const promptVersion = getPromptVersion(type);
    await dbRun(
      'INSERT INTO motor_results (user_id, curriculum_id, motor_type, result_json, status, simulated, prompt_version) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, curriculum_id || null, type, JSON.stringify(validated), 'done', isSimulated, promptVersion]
    );

    res.json({ data: { jobId: uuidv4(), status: 'done', output: validated, simulated: isSimulated } });
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
      const friendlyErrors = err.errors.map((e: any) => {
        const received = e.input;
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
      res.status(500).json({ error: 'Error generando contenido' });
    }
  }
});

// POST /api/motores/:type/stream — SSE streaming variant
router.post('/:type/stream', motorLimiter, async (req: any, res: any) => {
  const { type } = req.params;
  const validator = VALIDATORS[type];
  if (!validator) {
    return res.status(400).json({ error: `Motor desconocido: ${type}` });
  }

  const { params = {}, curriculum_id } = req.body || {};

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

  try {
    const result = await tryMinimaxStream(type, params);
    if (!result) {
      // MiniMax failed — generate mock and stream it
      const mockOutput = generateMockOutput(type, params);
      sendEvent({ status: 'done', output: mockOutput, simulated: true });
      return;
    }

    // Stream accumulated chunks token by token
    for (const chunk of result.chunks) {
      sendEvent({ chunk });
    }

    // Validate and store
    const validated = validator(result.output);
    const promptVersion = getPromptVersion(type);
    await dbRun(
      'INSERT INTO motor_results (user_id, curriculum_id, motor_type, result_json, status, simulated, prompt_version) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, curriculum_id || null, type, JSON.stringify(validated), 'done', false, promptVersion]
    );

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
      const friendlyErrors = err.errors.map((e: any) => {
        const received = e.input;
        return {
          campo: fieldLabels[e.path.join('.')] || e.path.join('.'),
          problema: translateZodMessage(e.message),
          recibido: typeof received === 'object' && received !== null ? 'valor recibido' : `tipo ${typeof received}`,
        };
      });
      sendEvent({ status: 'error', error: 'La estructura del contenido generado no es válida.', details: friendlyErrors });
    } else {
      console.error('[motores/stream]', err);
      sendEvent({ status: 'error', error: 'Error generando contenido' });
    }
  }

  res.end();
});

router.get('/:type/:jobId', (req, res) => {
  res.json({ data: { jobId: req.params.jobId, status: 'done', result: {} } });
});

export default router;