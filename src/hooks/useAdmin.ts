import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCacheStats, clearCache, getAdminUsers, createAdminUser } from '../api/admin';
import type { EstadoSistema } from '../types';

export function useCacheStats() {
  return useQuery({
    queryKey: ['admin', 'cache'],
    queryFn: getCacheStats,
    staleTime: 30 * 1000,
  });
}

export function useClearCache() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearCache,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cache'] }),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
    staleTime: 60 * 1000,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useEstadoSistema() {
  return useQuery<EstadoSistema, Error>({
    queryKey: ['admin', 'estado-sistema'],
    queryFn: () => import('../api/admin').then(m => m.getEstadoSistema()),
    staleTime: 10 * 1000,
  });
}
