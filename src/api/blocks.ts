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
