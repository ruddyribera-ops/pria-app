import { useQuery } from '@tanstack/react-query';
import type { EstadoSistema } from '../types';

export function useEstadoSistema() {
  return useQuery<EstadoSistema, Error>({
    queryKey: ['admin', 'estado-sistema'],
    queryFn: () => import('../api/admin').then(m => m.getEstadoSistema()),
    staleTime: 10 * 1000,
  });
}
