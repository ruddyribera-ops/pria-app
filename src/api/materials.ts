import type { Material } from '../types';
import client from './client';

export async function listMaterials(): Promise<Material[]> {
  const response = await client.get('/materials/');
  return response.data;
}

export async function uploadMaterial(file: File, tipo: string): Promise<Material> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post(`/materials/upload?tipo=${tipo}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteMaterial(materialId: number): Promise<void> {
  await client.delete(`/materials/${materialId}`);
}

// ===== Mock =====
export function getMockMaterials(): Material[] {
  return [
    { id: 1, filename: 'matematicas_3ero.pdf', tipo: 'textbook', size: 4_200_000 },
    { id: 2, filename: 'lenguaje_3ero.pdf', tipo: 'textbook', size: 3_800_000 },
    { id: 3, filename: 'ciencias_3ero.pdf', tipo: 'textbook', size: 5_100_000 },
  ];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
