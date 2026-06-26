/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCurriculum } from './useCurriculum';
import client from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useCurriculum', () => {
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

  describe('load()', () => {
    it('fetches curriculum successfully', async () => {
      // API returns { data: { data: { actual curriculum } } }
      (client.get as any).mockResolvedValue({
        data: {
          data: {
            id: 1,
            unidad_real: 'Matemáticas 1',
            temas: ['Tema 1', 'Tema 2'],
            contenido_temas: { 'Tema 1': 'Contenido 1' },
            paginas_temas: { 'Tema 1': 'pág. 5' },
          },
        },
      });

      const { result } = renderHook(() => useCurriculum(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });

      expect(result.current.curriculum).toBeTruthy();
      expect(result.current.curriculum?.unidad_real).toBe('Matemáticas 1');
      expect(result.current.error).toBeNull();
    });

    it('parses JSON string fields from API response', async () => {
      (client.get as any).mockResolvedValue({
        data: {
          data: {
            id: 1,
            unidad_real: 'Ciencias 2',
            temas: '["Tema A", "Tema B"]',
            contenido_temas: '{"Tema A": "Contenido A"}',
            paginas_temas: '{"Tema A": "pág. 10"}',
          },
        },
      });

      const { result } = renderHook(() => useCurriculum(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });

      expect(result.current.curriculum?.temas).toEqual(['Tema A', 'Tema B']);
      expect(result.current.curriculum?.contenido_temas).toEqual({ 'Tema A': 'Contenido A' });
      expect(result.current.curriculum?.paginas_temas).toEqual({ 'Tema A': 'pág. 10' });
    });

    it('handles load error', async () => {
      (client.get as any).mockRejectedValue(new Error('Failed to fetch curriculum'));

      const { result } = renderHook(() => useCurriculum(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });

      expect(result.current.curriculum).toBeNull();
      expect(result.current.error).toBe('Failed to fetch curriculum');
    });
  });

  describe('saveCurriculum()', () => {
    it('POSTs to backend and updates state', async () => {
      (client.get as any).mockResolvedValue({
        data: {
          data: {
            id: 2,
            unidad_real: 'Historia 1',
            temas: ['Tema 1'],
            contenido_temas: {},
            paginas_temas: {},
          },
        },
      });
      (client.post as any).mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useCurriculum(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });

      const saveData = {
        unidad_real: 'Historia 1',
        temas: ['Tema 1'],
        contenido_temas: {},
        paginas_temas: {},
      };

      await result.current.saveCurriculum(saveData);

      expect(client.post).toHaveBeenCalledWith('/curriculums', expect.objectContaining({
        unidad_real: 'Historia 1',
      }));
    });

    it('saveCurriculum error path', async () => {
      (client.get as any).mockResolvedValue({
        data: {
          data: {
            id: 1,
            unidad_real: 'Test',
            temas: [],
            contenido_temas: {},
            paginas_temas: {},
          },
        },
      });
      (client.post as any).mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useCurriculum(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });

      try {
        await result.current.saveCurriculum({
          unidad_real: 'Test',
          temas: [],
          contenido_temas: {},
          paginas_temas: {},
        });
      } catch {
        // Expected to throw
      }

      expect(client.post).toHaveBeenCalled();
    });
  });
});
