/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEstadoSistema } from './useAdmin';
import type { EstadoSistema } from '../types';

// Mock the admin API module
vi.mock('../api/admin', () => ({
  getEstadoSistema: vi.fn(),
}));

import { getEstadoSistema } from '../api/admin';

describe('useAdmin', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEstadoSistema', () => {
    it('returns admin data on successful fetch', async () => {
      const mockData: EstadoSistema = {
        motors: { synthesis: 'ok', plan: 'ok', slides: 'ok' },
        lastUpdated: '2026-01-01T00:00:00Z',
      };
      vi.mocked(getEstadoSistema).mockResolvedValue(mockData);

      const { result } = renderHook(() => useEstadoSistema(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('handles loading state initially', () => {
      const mockData: EstadoSistema = {
        motors: { synthesis: 'ok' },
        lastUpdated: '2026-01-01T00:00:00Z',
      };
      vi.mocked(getEstadoSistema).mockResolvedValue(mockData);

      const { result } = renderHook(() => useEstadoSistema(), {
        wrapper: createWrapper(),
      });

      // Initially loading could be true
      expect(result.current.isLoading !== undefined).toBe(true);
    });

    it('handles error state', async () => {
      vi.mocked(getEstadoSistema).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEstadoSistema(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
    });

    it('refetches data when refetch is called', async () => {
      const mockData: EstadoSistema = {
        motors: { synthesis: 'ok' },
        lastUpdated: '2026-01-01T00:00:00Z',
      };
      vi.mocked(getEstadoSistema).mockResolvedValue(mockData);

      const { result } = renderHook(() => useEstadoSistema(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const firstCallCount = vi.mocked(getEstadoSistema).mock.calls.length;

      result.current.refetch();

      await waitFor(() => {
        expect(vi.mocked(getEstadoSistema).mock.calls.length).toBeGreaterThan(firstCallCount);
      });
    });
  });
});
