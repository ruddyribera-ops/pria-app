import type { Material } from '../types';
import client from './client';

export async function listMaterials(): Promise<Material[]> {
  const response = await client.get('/materials/');
  return response.data;
}

export async function uploadMaterial(file: File, tipo: string): Promise<Material> {
  const response = await client.post('/materials/', {
    filename: file.name,
    tipo,
    size: file.size,
  });
  return response.data;
}

export async function deleteMaterial(materialId: number): Promise<void> {
  await client.delete(`/materials/${materialId}`);
}
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
