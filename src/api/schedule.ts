import client from './client';
import type { ScheduleEntry } from '../types';

// API returns { teacher_code, bloques: [...] } or { teacher_code, dia, bloques: [...] }
interface ScheduleApiResponse {
  teacher_code?: string;
  dia?: string;
  bloques?: ScheduleEntry[];
}

export async function getScheduleByDay(teacherCode: string, dia: string): Promise<ScheduleEntry[]> {
  const response = await client.get<ScheduleEntry[] | ScheduleApiResponse>(`/schedule/${teacherCode}/${dia}`);
  if (Array.isArray(response.data)) return response.data;
  const apiResp = response.data as ScheduleApiResponse;
  return apiResp.bloques ?? [];
}

export async function getSchedule(teacherCode: string): Promise<Record<string, ScheduleEntry[]>> {
  const response = await client.get<ScheduleApiResponse>(`/schedule/${teacherCode}`);
  const apiResp = response.data as ScheduleApiResponse;
  const bloques = apiResp.bloques ?? [];
  const grouped: Record<string, ScheduleEntry[]> = {};
  for (const b of bloques) {
    const day = (b as any).dia || 'LUNES';
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push({
      hora: `${(b as any).hora_inicio || ''} — ${(b as any).hora_fin || ''}`,
      materia: (b as any).materia || '',
      grado: (b as any).nivel_grado || '',
      nivel: '',
      docente: (b as any).teacher_code || '',
      tipo: (b as any).tipo || undefined,
    });
  }
  return grouped;
}

export const DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'] as const;
