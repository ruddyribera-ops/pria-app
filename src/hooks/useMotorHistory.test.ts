/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMotorHistory, fetchMotorHistory } from './useMotorHistory';
import client from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('useMotorHistory', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchMotorHistory', () => {
    it('fetches history without params', async () => {
      (client.get as any).mockResolvedValue({
        data: {
          data: [
            { id: 1, motor_type: 'synthesis', status: 'done', simulated: false, created_at: '2026-01-01', result_json_preview: '{}' },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      });

      const result = await fetchMotorHistory();

      expect(client.get).toHaveBeenCalledWith('/motores/history');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('fetches history with motor_type filter', async () => {
      (client.get as any).mockResolvedValue({
        data: {
          data: [
            { id: 2, motor_type: 'plan', status: 'done', simulated: null, created_at: '2026-01-02', result_json_preview: null },
          ],
          total: 1,
          page: 1,
          limit: 10,
        },
      });

      const result = await fetchMotorHistory({ motor_type: 'plan', limit: 10 });

      expect(client.get).toHaveBeenCalledWith(expect.stringContaining('motor_type=plan'));
      expect(client.get).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
      expect(result.data).toHaveLength(1);
      expect(result.data[0].motor_type).toBe('plan');
    });
  });

  describe('useMotorHistory hook', () => {
    it('loads history with data', async () => {
      (client.get as any).mockResolvedValue({
        data: {
          data: [
            { id: 1, motor_type: 'synthesis', status: 'done', simulated: false, created_at: '2026-01-01', result_json_preview: '{}' },
            { id: 2, motor_type: 'abp', status: 'done', simulated: null, created_at: '2026-01-02', result_json_preview: null },
          ],
          total: 2,
          page: 1,
          limit: 20,
        },
      });

      const { result } = renderHook(() => useMotorHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.total).toBe(2);
    });

    it('handles error state', async () => {
      (client.get as any).mockRejectedValue(new Error('Failed to fetch'));

      const { result } = renderHook(() => useMotorHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('filters by motor type', async () => {
      (client.get as any).mockResolvedValue({
        data: {
          data: [
            { id: 3, motor_type: 'quiz', status: 'done', simulated: false, created_at: '2026-01-03', result_json_preview: '{}' },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      });

      const { result } = renderHook(() => useMotorHistory({ motor_type: 'quiz' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

      expect(result.current.data?.data[0].motor_type).toBe('quiz');
    });
  });
});
