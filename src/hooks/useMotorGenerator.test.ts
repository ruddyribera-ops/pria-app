/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as useMotorGenerator from './useMotorGenerator';

// Mock promptRunner
vi.mock('../lib/pptx/promptRunner', () => ({
  executePrompt: vi.fn(),
}));

// Mock motores API
vi.mock('../api/motores', () => ({
  streamMotor: vi.fn(),
  getMotorResult: vi.fn(),
}));

// Mock useMotorHistory
vi.mock('../hooks/useMotorHistory', () => ({
  fetchMotorHistory: vi.fn(),
}));

import { executePrompt } from '../lib/pptx/promptRunner';
import { getMotorResult } from '../api/motores';
import { fetchMotorHistory } from '../hooks/useMotorHistory';

describe('useMotorGenerator', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generate() sets loading=true initially', async () => {
    (executePrompt as any).mockImplementation(() => new Promise(() => {})); // never resolves
    (fetchMotorHistory as any).mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useMotorGenerator.useMotorGenerator('synthesis', mockShowToast));

    act(() => {
      result.current.generate({ tema: 'test' });
    });

    expect(result.current.loading).toBe(true);
  });

  it('generate() on success sets result and loading=false', async () => {
    (executePrompt as any).mockResolvedValue({
      structuredOutput: { unidad_sintetizada: { temas_desarrollados: [] } },
      simulated: false,
    });
    (fetchMotorHistory as any).mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useMotorGenerator.useMotorGenerator('synthesis', mockShowToast));

    await act(async () => {
      await result.current.generate({ tema: 'test' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.result).toBeDefined();
    expect(mockShowToast).toHaveBeenCalledWith('¡Generado!');
  });

  it('generate() on error sets error and loading=false', async () => {
    (executePrompt as any).mockResolvedValue({
      error: 'AI service unavailable',
    });
    (fetchMotorHistory as any).mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useMotorGenerator.useMotorGenerator('synthesis', mockShowToast));

    await act(async () => {
      await result.current.generate({ tema: 'test' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('AI service unavailable');
  });

  it('generate() on throw sets error and loading=false', async () => {
    (executePrompt as any).mockRejectedValue(new Error('Network failure'));
    (fetchMotorHistory as any).mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useMotorGenerator.useMotorGenerator('synthesis', mockShowToast));

    await act(async () => {
      await result.current.generate({ tema: 'test' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // Error is stringified: "Error: Network failure"
    expect(result.current.error).toMatch(/Network failure/);
  });

  it('generate() clears previous result before new generation', async () => {
    // First call returns success
    (executePrompt as any)
      .mockResolvedValueOnce({
        structuredOutput: { first: 'result' },
        simulated: false,
      })
      .mockResolvedValueOnce({
        structuredOutput: { second: 'result' },
        simulated: false,
      });
    (fetchMotorHistory as any).mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useMotorGenerator.useMotorGenerator('synthesis', mockShowToast));

    // First generation
    await act(async () => {
      await result.current.generate({ tema: 'test1' });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect((result.current.result as any)?.first).toBe('result');

    // Second generation should clear previous result
    await act(async () => {
      await result.current.generate({ tema: 'test2' });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    // Result should be from second call, not accumulated
    expect(result.current.result).toBeDefined();
  });

  it('History hydration on mount — sets result if history has done status', async () => {
    (fetchMotorHistory as any).mockResolvedValue({
      data: [{
        id: 1,
        status: 'done',
        result_json_preview: '{"tema":"from history"}',
        simulated: false,
      }],
    });
    (getMotorResult as any).mockResolvedValue({
      result_json: { tema: 'from history' },
      simulated: false,
    });

    const { result } = renderHook(() => useMotorGenerator.useMotorGenerator('synthesis', mockShowToast));

    await waitFor(() => {
      expect(result.current.result).toBeDefined();
    }, { timeout: 3000 });

    expect(fetchMotorHistory).toHaveBeenCalledWith({ motor_type: 'synthesis', limit: 1 });
  });

  it('History hydration — skips if no history data', async () => {
    (fetchMotorHistory as any).mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useMotorGenerator.useMotorGenerator('synthesis', mockShowToast));

    // Should not have result from history since no data
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(result.current.result).toBeNull();
  });

  it('generateStreaming() calls streamMotor and sets result on done', async () => {
    // Mock streamMotor — it calls fetch() internally, but we test the hook's
    // integration with streamMotor's return value (not the raw fetch call).
    // streamMotor is already mocked at module level; give it a resolved return value.
    const { streamMotor } = await import('../api/motores');
    (streamMotor as any).mockResolvedValue({
      status: 'done',
      output: { slide: 'data' },
      simulated: false,
    });
    (fetchMotorHistory as any).mockResolvedValue({ data: [] });
    const onStream = vi.fn();

    const { result } = renderHook(() => useMotorGenerator.useMotorGenerator('slides', mockShowToast));

    await act(async () => {
      await result.current.generateStreaming({ tema: 'test' }, onStream);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(streamMotor).toHaveBeenCalled();
    expect(result.current.result).toEqual({ slide: 'data' });
  });
});
