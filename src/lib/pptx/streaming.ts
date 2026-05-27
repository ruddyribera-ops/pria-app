/**
 * streaming.ts — Streaming variant of prompt execution
 * Separated to avoid test transform issues with Vite ?raw imports
 */

import type { MotorType } from '../../hooks/useMotorGeneration';
import { callMinimaxStream, type StreamingCallback } from '../ai/minimaxClient';
import {
  formatContextoAnterior,
  generateMockOutput,
  type PromptContext,
  type PromptMode,
  type PromptResult,
} from './promptRunner';

// Static prompt imports (Vite ?raw inline) — same as promptRunner.ts
import alpha2Prompt from '../../prompts/Motor_Alpha-2.md?raw';
import m0aPrompt from '../../prompts/Motor_M0a.md?raw';
import m0bPrompt from '../../prompts/Motor_M0b.md?raw';
import m0cPrompt from '../../prompts/Motor_M0c.md?raw';
import m1aPrompt from '../../prompts/Motor_M1a.md?raw';
import m1bPrompt from '../../prompts/Motor_M1b.md?raw';
import m1cPrompt from '../../prompts/Motor_M1c.md?raw';
import m2aPrompt from '../../prompts/Motor_M2a.md?raw';
import m2bPrompt from '../../prompts/Motor_M2b.md?raw';
import pdcPrompt from '../../prompts/Motor_PDC_Trimestral.md?raw';
import recalPrompt from '../../prompts/Motor_Recalibracion.md?raw';
import microPrompt from '../../prompts/Motor_MicroObjetivos.md?raw';

function getSystemPrompt(motorType: MotorType): string {
  switch (motorType) {
    case 'alpha2':    return alpha2Prompt;
    case 'synthesis':  return m0aPrompt;
    case 'abp':        return m0bPrompt;
    case 'assessment': return m0cPrompt;
    case 'plan':       return m1aPrompt;
    case 'slides':     return m1bPrompt;
    case 'ficha':      return m1cPrompt;
    case 'quiz':       return m2aPrompt;
    case 'tutor':      return m2bPrompt;
    case 'pdc':        return pdcPrompt;
    case 'recalibrate': return recalPrompt;
    case 'micro':      return microPrompt;
    default:           return m0aPrompt;
  }
}

/**
 * Streaming variant of executePrompt.
 * Calls onChunk with accumulated text as chunks arrive from the API.
 * Falls back to non-streaming if streaming fails.
 */
export async function executePromptStreaming(
  context: PromptContext,
  mode: PromptMode,
  onChunk: StreamingCallback,
): Promise<PromptResult> {
  if (mode === 'SKIP') {
    return { mode: 'SKIP', structuredOutput: {} };
  }

  if (mode === 'MOCK') {
    try {
      const output = generateMockOutput(context);
      return { mode: 'MOCK', structuredOutput: output };
    } catch (err) {
      return { mode: 'MOCK', error: String(err), structuredOutput: {} };
    }
  }

  if (mode === 'FULL_AI') {
    try {
      const { motorType, params, accumulated } = context;
      const systemPrompt = getSystemPrompt(motorType);
      const contextoAnterior = formatContextoAnterior(accumulated, motorType);

      const normalizedParams = { ...params };
      if (motorType === 'synthesis' || motorType === 'alpha2') {
        if (normalizedParams.unidad && !normalizedParams.unidad_real) {
          normalizedParams.unidad_real = normalizedParams.unidad;
        }
        if (typeof normalizedParams.temas === 'string') {
          normalizedParams.temas = (normalizedParams.temas as string)
            .split(/[,\n]/).map(t => t.trim()).filter(Boolean);
        }
      }
      const variablesFormatted = JSON.stringify(normalizedParams, null, 2);

      const userMessage = [
        'Contexto anterior:',
        contextoAnterior,
        '',
        'Variables de entrada:',
        variablesFormatted,
        '',
        'Genera la salida en JSON según el OUTPUT SCHEMA del prompt de sistema.',
        'Responde ÚNICAMENTE con el JSON, sin markdown ni texto adicional.',
      ].join('\n');

      const temp = motorType === 'synthesis' ? 0.7 : 0.3;
      const result = await callMinimaxStream(systemPrompt, userMessage, onChunk, {
        temperature: temp,
        maxTokens: 4096,
        jsonMode: true,
      });

      if (!result.ok) {
        console.warn('MiniMax streaming failed:', result.error, '�?" falling back to MOCK');
        return {
          mode: 'FULL_AI',
          error: result.error,
          simulated: true,
          structuredOutput: generateMockOutput(context),
        };
      }

      try {
        const parsed = JSON.parse(result.text);
        return { mode: 'FULL_AI', rawOutput: result.text, simulated: result.simulated, structuredOutput: parsed };
      } catch {
        return {
          mode: 'FULL_AI',
          error: 'Failed to parse AI response as JSON',
          rawOutput: result.text,
          simulated: true,
          structuredOutput: generateMockOutput(context),
        };
      }
    } catch (err) {
      return {
        mode: 'FULL_AI',
        error: String(err),
        simulated: true,
        structuredOutput: generateMockOutput(context),
      };
    }

      try {
        const parsed = JSON.parse(result.text);
        return { mode: 'FULL_AI', rawOutput: result.text, structuredOutput: parsed };
      } catch {
        return {
          mode: 'FULL_AI',
          error: 'Failed to parse AI response as JSON',
          rawOutput: result.text,
          structuredOutput: generateMockOutput(context),
        };
      }
    } catch (err) {
      return {
        mode: 'FULL_AI',
        error: String(err),
        structuredOutput: generateMockOutput(context),
      };
    }
  }

  return { mode: 'SKIP', structuredOutput: {} };
}