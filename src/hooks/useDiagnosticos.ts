import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listDiagnosticos, uploadDiagnostico, deleteDiagnostico } from '../api/diagnosticos';

export function useDiagnosticos() {
  return useQuery({
    queryKey: ['diagnosticos'],
    queryFn: listDiagnosticos,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadDiagnostico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: string }) => uploadDiagnostico(file, tipo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnosticos'] }),
  });
}

export function useDeleteDiagnostico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDiagnostico(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnosticos'] }),
  });
}
