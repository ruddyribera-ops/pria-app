import client from './client';
import { TOKEN_KEY } from '../constants';

interface MotorResponse {
  status: string;
  message?: string;
  data?: unknown;
}

interface SynthesisPayload {
  grado_nivel: string;
  unidad: string;
  temas: string;
  diagnosticos: string;
}

interface PlanPayload {
  grado_nivel: string;
  tema_clase: string;
  conceptos_clave: string;
  palabras_clave: string;
  inteligencias_sugeridas: string;
  diagnosticos: string;
  objetivo_general: string;
  pag_tb?: string;
  pag_sb?: string;
  user_suggestions?: string;
}

interface PdcPayload {
  grado: string;
  seccion: string;
  materia: string;
  trimestre: number;
  ano_escolar: string;
  objetivos: string;
  contenidos: string;
  actividades: string;
  recursos: string;
  evaluacion: string;
  adaptaciones?: string;
  bibliografia?: string;
}

export async function motorSynthesis(data: SynthesisPayload): Promise<MotorResponse> {
  const response = await client.post('/motores/synthesis/', data);
  return response.data as MotorResponse;
}

export async function motorPlan(data: PlanPayload): Promise<MotorResponse> {
  const response = await client.post('/motores/plan/', data);
  return response.data as MotorResponse;
}

export async function motorPdc(data: PdcPayload): Promise<MotorResponse> {
  const response = await client.post('/motores/pdc/', data);
  return response.data as MotorResponse;
}

export async function motorSlides(data: Record<string, string>): Promise<MotorResponse> {
  const response = await client.post('/motores/slides/', data);
  return response.data as MotorResponse;
}

export async function motorFicha(data: Record<string, string>): Promise<MotorResponse> {
  const response = await client.post('/motores/ficha/', data);
  return response.data as MotorResponse;
}

export async function motorQuiz(data: Record<string, string>): Promise<MotorResponse> {
  const response = await client.post('/motores/quiz/', data);
  return response.data as MotorResponse;
}

export async function motorAlpha2(data: Record<string, string>): Promise<MotorResponse> {
  const response = await client.post('/motores/alpha2/', data);
  return response.data as MotorResponse;
}

export async function motorAbp(data: Record<string, string>): Promise<MotorResponse> {
  const response = await client.post('/motores/abp/', data);
  return response.data as MotorResponse;
}

export async function motorAssessment(data: Record<string, string>): Promise<MotorResponse> {
  const response = await client.post('/motores/assessment/', data);
  return response.data as MotorResponse;
}

/**
 * SSE streaming variant — calls POST /api/motores/:type/stream
 * Uses fetch() with ReadableStream for proper browser support.
 * Calls onToken for each streamed chunk, returns final output when done.
 */
export async function streamMotor(
  motorType: string,
  data: Record<string, unknown>,
  onToken: (text: string) => void,
  onStatus?: (status: string, data?: unknown) => void,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const token = localStorage.getItem(TOKEN_KEY);

  const response = await fetch(`/api/motores/${motorType}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ params: data }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const dataLines: string[] = [];
      for (const line of event.split('\n')) {
        if (line.startsWith('data: ')) {
          dataLines.push(line.slice(6));
        }
      }
      if (dataLines.length === 0) continue;
      const raw = dataLines.join('\n');
      if (raw === '[DONE]') continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.status) {
          onStatus?.(parsed.status, parsed);
          if (parsed.status === 'done' || parsed.status === 'error') {
            return parsed;
          }
        } else if (parsed.chunk) {
          onToken(parsed.chunk);
        }
      } catch {
        onToken(raw);
      }
    }
  }

  return {};
}

// ─── Motor result persistence ────────────────────────────────────────
interface MotorResultResponse {
  id: number;
  motor_type: string;
  result_json: Record<string, unknown>;
  created_at: string;
  simulated?: boolean | null;
}

export async function createMotorResult(data: {
  motor_type: string;
  result_json: string;
  curriculum_id?: number;
  simulated?: boolean;
}): Promise<{ id: number }> {
  const response = await client.post('/motores/results', data);
  return response.data.data as { id: number };
}

export async function updateMotorResult(id: number, resultJson: string): Promise<{ id: number; updated: boolean }> {
  const response = await client.put(`/motores/results/${id}`, { result_json: resultJson });
  return response.data.data as { id: number; updated: boolean };
}

export async function getMotorResult(id: number): Promise<MotorResultResponse> {
  const response = await client.get(`/motores/results/${id}`);
  return response.data.data as MotorResultResponse;
}

export type { MotorResponse, SynthesisPayload, PlanPayload, PdcPayload };
