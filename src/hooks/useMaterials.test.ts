/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMaterials, useUploadMaterial, useDeleteMaterial } from './useMaterials';
import * as materialsApi from '../api/materials';

// Mock the API
vi.mock('../api/materials', () => ({
  listMaterials: vi.fn(),
  uploadMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
}));

describe('useMaterials', () => {
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

  describe('useMaterials', () => {
    it('lists materials', async () => {
      const mockData = [
        { id: 1, filename: 'test.pdf', tipo: 'pdf', size: 1024 },
        { id: 2, filename: 'doc.docx', tipo: 'docx', size: 2048 },
      ];
      vi.mocked(materialsApi.listMaterials).mockResolvedValue(mockData);

      const { result } = renderHook(() => useMaterials(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.data).toHaveLength(2);
    });

    it('handles error on list', async () => {
      vi.mocked(materialsApi.listMaterials).mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useMaterials(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useUploadMaterial', () => {
    it('uploads material with FormData', async () => {
      const mockMaterial = { id: 3, filename: 'upload.pdf', tipo: 'pdf', size: 512 };
      vi.mocked(materialsApi.uploadMaterial).mockResolvedValue(mockMaterial);

      const { result } = renderHook(() => useUploadMaterial(), {
        wrapper: createWrapper(),
      });

      const mockFile = new File(['content'], 'upload.pdf', { type: 'application/pdf' });

      result.current.mutate({ file: mockFile, tipo: 'pdf' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

      expect(materialsApi.uploadMaterial).toHaveBeenCalledWith(mockFile, 'pdf');
    });
  });

  describe('useDeleteMaterial', () => {
    it('deletes material by id', async () => {
      vi.mocked(materialsApi.deleteMaterial).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteMaterial(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(1);

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

      expect(materialsApi.deleteMaterial).toHaveBeenCalledWith(1);
    });
  });
});
