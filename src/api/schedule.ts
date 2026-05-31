import client from './client';
import type { ScheduleEntry, ScheduleBloqueRow } from '../types';

// API returns { teacher_code, bloques: [...] } or { teacher_code, dia, bloques: [...] }
interface ScheduleApiResponse {
  teacher_code?: string;
  dia?: string;
  bloques?: ScheduleEntry[];
}

export async function getScheduleByDay(teacherCode: string, dia: string): Promise<ScheduleEntry[]> {
  const response = await client.get(`/schedule/${teacherCode}/${dia}`);
  if (Array.isArray(response.data)) return response.data;
  const apiResp = response.data as ScheduleApiResponse;
  return apiResp.bloques ?? [];
}

export async function getSchedule(teacherCode: string): Promise<Record<string, ScheduleEntry[]>> {
  const response = await client.get<{ bloques?: ScheduleBloqueRow[] }>(`/schedule/${teacherCode}`);
  const apiResp = response.data as { bloques?: ScheduleBloqueRow[] };
  const bloques = apiResp.bloques ?? [];
  const grouped: Record<string, ScheduleEntry[]> = {};
  for (const b of bloques) {
    const day = b.dia || 'LUNES';
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push({
      hora: b.hora_inicio ? `${b.hora_inicio} — ${b.hora_fin}` : '',
      materia: b.materia || '',
      grado: b.nivel_grado || '',
      nivel: '',
      docente: b.teacher_code || '',
      tipo: b.tipo,
    });
  }
  return grouped;
}

export const DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'] as const;
