import type { UsuarioCreate, UsuarioResponse, UsuarioUpdate } from '../types';
import client from './client';

export async function listUsers(): Promise<UsuarioResponse[]> {
  const response = await client.get('/admin/users/');
  return response.data.data;
}

export async function createUser(data: UsuarioCreate): Promise<UsuarioResponse> {
  const { username, ...rest } = data;
  const payload = { usuario: username, ...rest };
  const response = await client.post('/admin/users/', payload);
  return response.data.data;
}

export async function updateUser(userId: number, data: UsuarioUpdate): Promise<UsuarioResponse> {
  const response = await client.put(`/admin/users/${userId}`, data);
  return response.data.data;
}

export async function deleteUser(userId: number): Promise<void> {
  await client.delete(`/admin/users/${userId}`);
}
