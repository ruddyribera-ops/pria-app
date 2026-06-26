import client from './client';
import type { ScheduleEntry } from '../types';

// API returns { teacher_code, bloques: [...] } or { teacher_code, dia, bloques: [...] }
interface ScheduleApiResponse {
  teacher_code?: string;
  dia?: string;
  bloques?: ScheduleEntry[];
}

export async function getScheduleByDay(teacherCode: string, dia: string): Promise<ScheduleEntry[]> {
  try {
    const response = await client.get(`/schedule/${teacherCode}/${dia}`);
    if (Array.isArray(response.data)) return response.data;
    const apiResp = response.data as ScheduleApiResponse;
    return apiResp.bloques ?? [];
  } catch (err) {
    console.warn('[getScheduleByDay] Network error:', err);
    return [];
  }
}

export const DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'] as const;
