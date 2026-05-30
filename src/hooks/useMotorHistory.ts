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

async function fetchMotorHistory(): Promise<MotorHistoryEntry[]> {
  const response = await client.get('/motores/history');
  return response.data.data ?? [];
}

export function useMotorHistory() {
  return useQuery({
    queryKey: ['motor-history'],
    queryFn: fetchMotorHistory,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
