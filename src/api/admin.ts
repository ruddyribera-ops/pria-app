import type { EstadoSistema } from '../types';
import client from './client';

export interface AdminUser {
  id: number;
  nombre: string;
  usuario: string;
  role: string;
  teacher_code?: string;
}

export interface CreatedAdminUser {
  id: number;
  nombre: string;
  usuario: string;
  role: string;
  nivel: string;
  grado: string;
}

export async function getEstadoSistema(): Promise<EstadoSistema> {
  const response = await client.get<{ data: EstadoSistema }>('/admin/estado-sistema');
  return response.data.data;
}
export async function getCacheStats() {
  const response = await client.get<{ data: { entries: number; motores_cache: number; pdfs_cache: number } }>('/admin/cache/stats');
  return response.data.data;
}

export async function clearCache() {
  const response = await client.delete<{ data: { cleared: boolean } }>('/admin/cache');
  return response.data.data;
}

export async function resetDay(teacherCode?: string) {
  const response = await client.post<{ data: { reset: boolean } }>('/admin/reset-day', { teacherCode });
  return response.data.data;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await client.get<{ data: AdminUser[] }>('/admin/users');
  return response.data.data;
}

export async function createAdminUser(data: { nombre: string; usuario: string; password: string; nivel: string; grado: string }): Promise<CreatedAdminUser> {
  const response = await client.post<{ data: CreatedAdminUser }>('/admin/users', data);
  return response.data.data;
}

// ===== Motor definitions =====
export const MOTORS = [
  { key: 'synthesis', label: 'Síntesis Unidad', icon: '💡' },
  { key: 'abp', label: 'Proyecto ABP', icon: '🎯' },
  { key: 'assessment', label: 'Evaluación', icon: '📝' },
  { key: 'plan', label: 'Plan de Clase', icon: '📋' },
  { key: 'slides', label: 'Diapositivas', icon: '🖥️' },
  { key: 'ficha', label: 'Ficha Gamificada', icon: '🎮' },
  { key: 'quiz', label: 'Pop Quiz', icon: '❓' },
  { key: 'tutor', label: 'Guía del Tutor', icon: '👤' },
  { key: 'pdc', label: 'PDC', icon: '📊' },
  { key: 'recalibrate', label: 'Recalibrar', icon: '🔄' },
  { key: 'micro', label: 'Microclase', icon: '🎓' },
];
