/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDiagnosticos, useUploadDiagnostico, useDeleteDiagnostico } from './useDiagnosticos';
import * as diagnosticosApi from '../api/diagnosticos';

// Mock the API
vi.mock('../api/diagnosticos', () => ({
  listDiagnosticos: vi.fn(),
  uploadDiagnostico: vi.fn(),
  deleteDiagnostico: vi.fn(),
}));

describe('useDiagnosticos', () => {
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

  describe('useDiagnosticos', () => {
    it('loads list of diagnosticos', async () => {
      const mockData = [
        { id: 1, estudiante: 'Juan', nivel: 'Primaria', area: 'Matemáticas' },
        { id: 2, estudiante: 'Maria', nivel: 'Secundaria', area: 'Ciencias' },
      ];
      vi.mocked(diagnosticosApi.listDiagnosticos).mockResolvedValue(mockData);

      const { result } = renderHook(() => useDiagnosticos(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.data).toHaveLength(2);
    });

    it('handles error on list', async () => {
      vi.mocked(diagnosticosApi.listDiagnosticos).mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useDiagnosticos(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useUploadDiagnostico', () => {
    it('uploads diagnostico file', async () => {
      const mockDiagnostico = { id: 3, estudiante: 'Pedro', nivel: 'Primaria', tipo: 'evaluacion' };
      vi.mocked(diagnosticosApi.uploadDiagnostico).mockResolvedValue(mockDiagnostico);

      const { result } = renderHook(() => useUploadDiagnostico(), {
        wrapper: createWrapper(),
      });

      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      await waitFor(() => {
        result.current.mutate({ file: mockFile, tipo: 'evaluacion' });
      }, { timeout: 5000 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

      expect(diagnosticosApi.uploadDiagnostico).toHaveBeenCalledWith(mockFile, 'evaluacion');
    });
  });

  describe('useDeleteDiagnostico', () => {
    it('deletes diagnostico by id', async () => {
      vi.mocked(diagnosticosApi.deleteDiagnostico).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDiagnostico(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(1);

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

      expect(diagnosticosApi.deleteDiagnostico).toHaveBeenCalledWith(1);
    });
  });
});
