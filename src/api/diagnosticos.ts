import type { Diagnostico } from '../types';
import client from './client';

export async function listDiagnosticos(): Promise<Diagnostico[]> {
  const response = await client.get('/diagnosticos/');
  return response.data.data;
}

export async function uploadDiagnostico(file: File, tipo: string): Promise<Diagnostico> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post(`/diagnosticos/upload?tipo=${tipo}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}

export async function deleteDiagnostico(diagnosticoId: number): Promise<void> {
  await client.delete(`/diagnosticos/${diagnosticoId}`);
}
