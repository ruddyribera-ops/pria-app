import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const MINIMAX_API_URL = 'https://api.minimax.io/v1/chat/completions';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';

const generateSchema = z.object({
  systemPrompt: z.string().min(1, 'systemPrompt es requerido'),
  userMessage: z.string().min(1, 'userMessage es requerido'),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().min(1).max(16384).default(4096),
  jsonMode: z.boolean().default(false),
});

interface MinimaxChoice {
  finish_reason?: string;
  message?: { role?: string; content?: string };
}

interface MinimaxResponse {
  choices?: MinimaxChoice[];
  error?: { message: string };
}

function cleanResponse(raw: string): string {
  let cleaned = raw.trim();
  // Strip <think> blocks (common in reasoning models)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  // Strip markdown code fences
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

const router = Router();
router.use(authMiddleware);

router.post('/generate', async (req: any, res) => {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'AI no configurada' });
  }

  // Validate input
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return res.status(400).json({
      ok: false,
      error: `${firstError.path.join('.')}: ${firstError.message}`,
    });
  }

  const { systemPrompt, userMessage, temperature, maxTokens, jsonMode } = parsed.data;

  const body: Record<string, unknown> = {
    model: MINIMAX_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[ai] MiniMax HTTP error:', response.status, errorText);
      return res.status(502).json({
        ok: false,
        error: `Error de API: ${response.status} — ${errorText || 'sin detalles'}`,
      });
    }

    const data: MinimaxResponse = await response.json();

    if (data.error) {
      console.error('[ai] MiniMax API error:', data.error.message);
      return res.status(502).json({
        ok: false,
        error: 'Error del modelo: ' + data.error.message,
      });
    }

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      console.error('[ai] MiniMax respuesta vacía');
      return res.status(502).json({
        ok: false,
        error: 'El modelo devolvió una respuesta vacía',
      });
    }

    const text = cleanResponse(raw);
    res.json({ ok: true, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ai] MiniMax fetch error:', message);
    res.status(502).json({ ok: false, error: 'Error de conexión con el modelo de AI' });
  }
});

export default router;
