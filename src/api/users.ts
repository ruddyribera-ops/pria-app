import type { UsuarioCreate, UsuarioResponse, UsuarioUpdate } from '../types';
import client from './client';

export async function listUsers(): Promise<UsuarioResponse[]> {
  const response = await client.get('/users/');
  return response.data;
}

export async function createUser(data: UsuarioCreate): Promise<UsuarioResponse> {
  const response = await client.post('/users/', data);
  return response.data;
}

export async function updateUser(userId: number, data: UsuarioUpdate): Promise<UsuarioResponse> {
  const response = await client.put(`/users/${userId}`, data);
  return response.data;
}

export async function deleteUser(userId: number): Promise<void> {
  await client.delete(`/users/${userId}`);
}
