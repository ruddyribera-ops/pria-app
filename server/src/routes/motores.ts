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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, '../motores/prompts');

const promptCache = new Map<string, string>();
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
    temperature: motorType === 'synthesis' ? 0.7 : 0.3,
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

const router = Router();
router.use(authMiddleware);

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
      'SELECT id, motor_type, status, simulated, created_at FROM motor_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
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

    // Store in DB
    if (curriculum_id) {
      await dbRun(
        'INSERT INTO motor_results (user_id, curriculum_id, motor_type, result_json, status, simulated) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.user.id, curriculum_id, type, JSON.stringify(validated), 'done', isSimulated]
      );
    }

    res.json({ data: { jobId: uuidv4(), status: 'done', output: validated, simulated: isSimulated } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(422).json({
        error: 'El motor devolvió datos con formato inválido',
        details: err.errors.map((e: any) => ({
          campo: e.path.join('.'),
          problema: e.message,
          recibido: typeof e.input === 'object' ? 'objeto' : typeof e.input,
        })),
      });
    } else {
      res.status(500).json({ error: 'Error generando contenido' });
    }
  }
});

router.get('/:type/:jobId', (req, res) => {
  res.json({ data: { jobId: req.params.jobId, status: 'done', result: {} } });
});

export default router;