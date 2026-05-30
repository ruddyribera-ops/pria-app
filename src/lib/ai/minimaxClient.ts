/**
 * minimaxClient.ts — Cliente de IA (vía backend PRIA)
 * ====================================================
 * Todas las llamadas a MiniMax se enrutan a través del backend Express
 * en lugar de llamar a la API de MiniMax directamente desde el navegador.
 * Esto evita exponer la API key en el bundle del frontend.
 *
 * El backend recibe los params, llama a MiniMax internamente,
 * y devuelve la salida validada según el schema del motor.
 */

import client from '../../api/client';

// ── Tipos (sin cambios en la interfaz pública) ──

export interface AiResult {
  ok: boolean;
  text: string;
  error?: string;
  simulated?: boolean;
}

/** Tipo de motor para enrutar al backend correcto */
export type MotorType =
  | 'synthesis' | 'alpha2' | 'abp' | 'assessment'
  | 'plan' | 'slides' | 'ficha' | 'quiz'
  | 'tutor' | 'pdc' | 'recalibrate' | 'micro';

/** Streaming callback type — called once per text chunk as it arrives */
export type StreamingCallback = (text: string) => void;

// ── Utilidades públicas (sin cambios) ──

/** Strip <think> blocks from MiniMax response */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/** Strip markdown code fences and extract JSON object */
export function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith('```json')) t = t.slice(7);
  else if (t.startsWith('```')) t = t.slice(3);
  if (t.endsWith('```')) t = t.slice(0, -3);
  t = t.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return t.trim();
}

/** Extract parseable JSON from raw AI text (public for testing) */
export function extractJSON(text: string): string {
  return stripFences(stripThinking(text));
}

// ── Llamada principal (ahora va al backend) ──

/**
 * Llama al backend PRIA para generar contenido con IA.
 * Dos modos de operación:
 *
 * 1. **Motor (motorType presente):** enruta al endpoint específico del motor
 *    (`POST /api/motores/{motorType}/`) con los `params` estructurados.
 * 2. **Genérico (sin motorType):** llama a `POST /api/ai/generate` con
 *    systemPrompt + userMessage como prompt libre. Útil para extracción,
 *    análisis y otros casos que no encajan en un motor con schema fijo.
 *
 * @param systemPrompt  — instrucciones del sistema (rol system)
 * @param userMessage   — entrada del usuario (rol user)
 * @param options       — { temperature, maxTokens, jsonMode, motorType, params }
 */
export async function callMinimax(
  systemPrompt: string,
  userMessage: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    motorType?: MotorType;
    params?: Record<string, unknown>;
  } = {},
): Promise<AiResult> {
  const { motorType, params, temperature, maxTokens, jsonMode } = options;

  // ── Ruta legacy: llamada genérica sin motorType ──
  if (!motorType) {
    try {
      const response = await client.post('/ai/generate', {
        systemPrompt,
        userMessage,
        temperature,
        maxTokens,
        jsonMode,
      });

      const data = response.data as {
        text?: string;
        data?: { output?: unknown };
        error?: string;
      };

      if (data.error) {
        return { ok: false, text: '', error: data.error };
      }

      const output = data.text ?? (data.data?.output ? JSON.stringify(data.data.output) : '');
      return { ok: true, text: output };
    } catch (err: any) {
      const msg = err?.response?.data?.error
        || err?.message
        || String(err);
      return { ok: false, text: '', error: msg };
    }
  }

  // ── Ruta motor: enrutar al endpoint específico ──
  try {
    const response = await client.post('/motores/' + motorType + '/', {
      params: params || {},
    });

    const data = response.data as {
      data?: {
        status?: string;
        output?: unknown;
      };
      error?: string;
    };

    if (data.error) {
      return { ok: false, text: '', error: data.error };
    }

    const output = data.data?.output;
    const simulated = (data.data as any)?.simulated === true;
    if (!output) {
      return { ok: false, text: '', error: 'Backend no devolvi�� output' };
    }

    // Serializar el output como JSON para mantener compatibilidad con AiResult.text
    return { ok: true, text: JSON.stringify(output), simulated };
  } catch (err: any) {
    const msg = err?.response?.data?.error
      || err?.message
      || String(err);
    return { ok: false, text: '', error: msg };
  }
}

/**
 * Streaming variant using SSE via fetch + ReadableStream.
 *
 * EventSource does not support POST requests, so we use fetch()
 * and read the response body as an SSE stream.
 *
 * Backend SSE format:
 *   data: {"status":"started"}\n\n         → ignore (log if needed)
 *   data: {"chunk":"..."}\n\n       → call onChunk(text) immediately
 *   data: {"status":"done","output":{...}}\n\n → return { ok: true, text: JSON.stringify(output) }
 *   data: {"status":"error","error":"..."}\n\n → return { ok: false, text: '', error: ... }
 */
export async function callMinimaxStream(
  _systemPrompt: string,
  _userMessage: string,
  onChunk: StreamingCallback,
  options: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    motorType?: MotorType;
    params?: Record<string, unknown>;
  } = {},
): Promise<AiResult> {
  const { motorType, params, temperature, maxTokens, jsonMode } = options;

  const controller = new AbortController();

  try {
    // ── Determine endpoint and POST body ─────────────────────────────────────
    let url: string;
    let body: Record<string, unknown>;

    if (motorType) {
      // Motor SSE endpoint: POST /api/motores/{type}/stream
      // Backend loads prompt from disk; body carries params + curriculum_id
      url = `/api/motores/${motorType}/stream`;
      body = {
        params: params || {},
        curriculum_id: (params?.curriculum_id as string) || '',
      };
    } else {
      // Generic SSE endpoint: POST /api/ai/stream
      url = '/api/ai/stream';
      body = {
        systemPrompt: _systemPrompt,
        userMessage: _userMessage,
        temperature,
        maxTokens,
        jsonMode,
      };
    }

    // ── Open fetch stream ─────────────────────────────────────────────────────
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false, text: '', error: `HTTP ${response.status}: ${text}` };
    }

    if (!response.body) {
      return { ok: false, text: '', error: 'Response body is null — SSE not supported by this endpoint' };
    }

    // ── Read SSE stream ───────────────────────────────────────────────────────
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;

    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;

      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }

      if (done) {
        // Flush any remaining content in buffer
        buffer += decoder.decode(undefined, { stream: false });
      }

      // ── Process complete SSE lines ─────────────────────────────────────────
      // Lines are separated by "\n"; data lines start with "data: "
      const lines = buffer.split('\n');
      // Keep incomplete last line in buffer (may be partial SSE)
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.slice('data:'.length).trim();
        if (!jsonStr) continue;

        let event: { status?: string; chunk?: string; output?: unknown; error?: string };
        try {
          event = JSON.parse(jsonStr);
        } catch {
          // Malformed JSON — skip
          continue;
        }

        if (event.status === 'started') {
          // Server-side initialization — ignore, streaming has started
          continue;
        }

        if (event.chunk !== undefined) {
          // Text chunk — deliver immediately to UI
          onChunk(event.chunk);
          continue;
        }

        if (event.status === 'done') {
          // Streaming complete
          return {
            ok: true,
            text: event.output ? JSON.stringify(event.output) : '',
            simulated: false,
          };
        }

        if (event.status === 'error') {
          return { ok: false, text: '', error: event.error ?? 'Unknown SSE error' };
        }
      }
    }

    // Stream ended without a "done" event
    return { ok: false, text: '', error: 'SSE stream ended without a done event' };
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError' || (err as DOMException)?.name === 'AbortError') {
      return { ok: false, text: '', error: 'Request was cancelled' };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, text: '', error: msg };
  } finally {
    // Ensure reader is cancelled if we exit early
    controller.abort();
  }
}
