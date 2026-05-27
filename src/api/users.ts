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

// ===== Mock =====
export function getMockUsers(): UsuarioResponse[] {
  return [
    { id: 1, username: 'cgarcia', usuario: 'cgarcia', nombre: 'Carlos García', role: 'docente', rol: 'docente', nivel: 'Secundaria', grado: '3er año', correo: 'cgarcia@pria.edu', teacher_code: 'GARCIA', estado: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, username: 'alopez', usuario: 'alopez', nombre: 'Ana López', role: 'docente', rol: 'docente', nivel: 'Secundaria', grado: '2do año', correo: 'alopez@pria.edu', teacher_code: 'LOPEZ', estado: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 3, username: 'admin', usuario: 'admin', nombre: 'Admin PRIA', role: 'admin', rol: 'admin', nivel: 'Secundaria', grado: '3er año', correo: 'admin@pria.edu', teacher_code: 'ADMIN', estado: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 4, username: 'mrodriguez', usuario: 'mrodriguez', nombre: 'María Rodríguez', role: 'docente', rol: 'docente', nivel: 'Primaria', grado: '5°', correo: 'mrodriguez@pria.edu', teacher_code: 'RODRIGUEZ', estado: false, created_at: '2026-01-01T00:00:00Z' },
  ];
}
