import type { BloqueCreate, BloqueResponse, BloqueUpdate } from '../types';
import client from './client';

export async function listBlocks(): Promise<BloqueResponse[]> {
  const response = await client.get('/blocks/');
  return response.data;
}

export async function createBlock(data: BloqueCreate): Promise<BloqueResponse> {
  const response = await client.post('/blocks/', data);
  return response.data;
}

export async function updateBlock(blockId: number, data: BloqueUpdate): Promise<BloqueResponse> {
  const response = await client.put(`/blocks/${blockId}`, data);
  return response.data;
}

export async function deleteBlock(blockId: number): Promise<void> {
  await client.delete(`/blocks/${blockId}`);
}

// ===== Mock =====
export function getMockBlocks(): BloqueResponse[] {
  return [
    { id: 1, teacher_code: 'ADMIN', dia: 'LUNES', hora_inicio: '07:30', hora_fin: '08:20', tipo: 'clase', materia: 'Matemáticas', nivel_grado: '3er año', ubicacion: 'Aula 101', orden: 1, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, teacher_code: 'ADMIN', dia: 'LUNES', hora_inicio: '08:20', hora_fin: '09:10', tipo: 'clase', materia: 'Lenguaje', nivel_grado: '3er año', ubicacion: 'Aula 102', orden: 2, created_at: '2026-01-01T00:00:00Z' },
    { id: 3, teacher_code: 'ADMIN', dia: 'LUNES', hora_inicio: '09:10', hora_fin: '10:00', tipo: 'clase', materia: 'Cs. Naturales', nivel_grado: '3er año', ubicacion: 'Lab A', orden: 3, created_at: '2026-01-01T00:00:00Z' },
    { id: 4, teacher_code: 'ADMIN', dia: 'LUNES', hora_inicio: '10:00', hora_fin: '10:30', tipo: 'recreo', orden: 4, created_at: '2026-01-01T00:00:00Z' },
    { id: 5, teacher_code: 'ADMIN', dia: 'LUNES', hora_inicio: '10:30', hora_fin: '11:20', tipo: 'clase', materia: 'Historia', nivel_grado: '3er año', ubicacion: 'Aula 103', orden: 5, created_at: '2026-01-01T00:00:00Z' },
    { id: 6, teacher_code: 'ADMIN', dia: 'LUNES', hora_inicio: '11:20', hora_fin: '12:10', tipo: 'clase', materia: 'Educación Fís.', nivel_grado: '3er año', ubicacion: 'Cancha', orden: 6, created_at: '2026-01-01T00:00:00Z' },
  ];
}
