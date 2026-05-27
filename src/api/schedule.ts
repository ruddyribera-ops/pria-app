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
  // Handle { teacher_code, dia, bloques } format
  const apiResp = response.data as ScheduleApiResponse;
  return apiResp.bloques ?? [];
}

export async function getSchedule(teacherCode: string): Promise<Record<string, ScheduleEntry[]>> {
  const response = await client.get<ScheduleApiResponse>(`/schedule/${teacherCode}`);
  const apiResp = response.data as ScheduleApiResponse;
  const bloques = apiResp.bloques ?? [];
  // Group by day
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

// ===== Mock data =====
const DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'];

const MOCK_CLASSES: Record<string, ScheduleEntry[]> = {
  LUNES: [
    { hora: '07:30 — 08:20', materia: '📐 Matemáticas', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. García' },
    { hora: '08:20 — 09:10', materia: '📖 Lenguaje', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. López' },
    { hora: '09:10 — 10:00', materia: '🔬 Ciencias Nat.', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. Martínez' },
    { hora: '10:00 — 10:30', materia: '🍎 Recreo', grado: '—', nivel: '—', docente: '—', tipo: 'recess' },
    { hora: '10:30 — 11:20', materia: '📜 Historia', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. Rodríguez' },
    { hora: '11:20 — 12:10', materia: '⚽ Educación Fís.', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. Sánchez' },
  ],
  MARTES: [
    { hora: '07:30 — 08:20', materia: '📐 Matemáticas', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. García' },
    { hora: '08:20 — 09:10', materia: '📖 Lenguaje', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. López' },
    { hora: '10:30 — 11:20', materia: '📜 Historia', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. Rodríguez' },
  ],
  MIÉRCOLES: [
    { hora: '07:30 — 08:20', materia: '📐 Matemáticas', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. García' },
    { hora: '09:10 — 10:00', materia: '🔬 Ciencias Nat.', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. Martínez' },
    { hora: '10:00 — 10:30', materia: '🍎 Recreo', grado: '—', nivel: '—', docente: '—', tipo: 'recess' },
    { hora: '11:20 — 12:10', materia: '⚽ Educación Fís.', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. Sánchez' },
  ],
  JUEVES: [
    { hora: '08:20 — 09:10', materia: '📖 Lenguaje', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. López' },
    { hora: '10:30 — 11:20', materia: '📜 Historia', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. Rodríguez' },
  ],
  VIERNES: [
    { hora: '07:30 — 08:20', materia: '📐 Matemáticas', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. García' },
    { hora: '09:10 — 10:00', materia: '🔬 Ciencias Nat.', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. Martínez' },
    { hora: '11:20 — 12:10', materia: '⚽ Educación Fís.', grado: '3er año', nivel: 'Secundaria', docente: 'Prof. Sánchez' },
  ],
};

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

export function getMockDaySchedule(): ScheduleEntry[] {
  const today = new Date();
  const dayName = getDayName(today).toUpperCase();
  return MOCK_CLASSES[dayName] || MOCK_CLASSES['LUNES'];
}

export function getMockWeekSchedule(): Record<string, ScheduleEntry[]> {
  return MOCK_CLASSES;
}

export function getMockTeachers(): { code: string; name: string }[] {
  return [
    { code: 'RUDDY', name: 'Ruddy Ribera — Tecnología' },
    { code: 'ADELA', name: 'Adela — Primaria' },
    { code: 'AIDEE', name: 'Aidee Verastegui — Primaria' },
    { code: 'YAMILE', name: 'Yamile Valdez — Primaria' },
    { code: 'GALIA', name: 'Galia — Primaria' },
    { code: 'VANESA', name: 'Vanesa Rodriguez — Primaria' },
    { code: 'JIMENA', name: 'Jimena Cano — Primaria' },
    { code: 'NOELIA', name: 'Noelia Choque — Primaria' },
  ];
}

export { DAYS, MOCK_CLASSES };
