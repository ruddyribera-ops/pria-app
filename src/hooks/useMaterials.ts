import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMaterials, uploadMaterial, deleteMaterial } from '../api/materials';

export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: listMaterials,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: string }) => uploadMaterial(file, tipo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMaterial(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  });
}
