import type { Diagnostico } from '../types';
import client from './client';

export async function listDiagnosticos(): Promise<Diagnostico[]> {
  const response = await client.get('/diagnosticos/');
  return response.data;
}

export async function uploadDiagnostico(file: File, tipo: string): Promise<Diagnostico> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post(`/diagnosticos/upload?tipo=${tipo}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteDiagnostico(diagnosticoId: number): Promise<void> {
  await client.delete(`/diagnosticos/${diagnosticoId}`);
}

// ===== Mock =====
export function getMockDiagnosticos(): Diagnostico[] {
  return [
    { id: 1, estudiante: '', nivel: '', filename: 'diagnostico_matematicas_3A.docx', tipo: 'docx', size: 245_000 },
    { id: 2, estudiante: '', nivel: '', filename: 'diagnostico_lenguaje_3A.pdf', tipo: 'pdf', size: 312_000 },
    { id: 3, estudiante: '', nivel: '', filename: 'resultados_prueba_inicial.txt', tipo: 'txt', size: 18_000 },
  ];
}
