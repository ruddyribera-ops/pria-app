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
    if (!output) {
      return { ok: false, text: '', error: 'Backend no devolvió output' };
    }

    // Serializar el output como JSON para mantener compatibilidad con AiResult.text
    return { ok: true, text: JSON.stringify(output) };
  } catch (err: any) {
    const msg = err?.response?.data?.error
      || err?.message
      || String(err);
    return { ok: false, text: '', error: msg };
  }
}

/**
 * Streaming variant. NOTE: Backend does not support SSE streaming yet.
 * This function calls the non-streaming endpoint and passes the full 
 * response as a single chunk. The UI receives progressive updates via 
 * polling, not true streaming.
 *
 * TODO: Implement SSE in backend for true streaming.
 */
export async function callMinimaxStream(
  systemPrompt: string,
  userMessage: string,
  onChunk: StreamingCallback,
  options: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    motorType?: MotorType;
    params?: Record<string, unknown>;
  } = {},
): Promise<AiResult> {
  const result = await callMinimax(systemPrompt, userMessage, options);
  if (result.ok && result.text) {
    onChunk(result.text);
  }
  return result;
}
