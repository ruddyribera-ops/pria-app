import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export interface MotorHistoryEntry {
  id: number;
  motor_type: string;
  status: string;
  simulated: boolean | null;
  created_at: string;
  result_json_preview: string | null;
}

export interface MotorHistoryResponse {
  data: MotorHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface MotorHistoryParams {
  page?: number;
  limit?: number;
  motor_type?: string | null;
}

export async function fetchMotorHistory(params?: MotorHistoryParams): Promise<MotorHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.motor_type) searchParams.set('motor_type', params.motor_type);

  const queryString = searchParams.toString();
  const url = `/motores/history${queryString ? `?${queryString}` : ''}`;
  const response = await client.get(url);
  return response.data;
}

export function useMotorHistory(params?: MotorHistoryParams) {
  return useQuery({
    queryKey: ['motor-history', params],
    queryFn: () => fetchMotorHistory(params),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
