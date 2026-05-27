import client from './client';

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

export type { MotorResponse, SynthesisPayload, PlanPayload, PdcPayload };
