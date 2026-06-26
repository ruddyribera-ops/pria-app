/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act as reactAct } from '@testing-library/react';
import { useHealthCheck } from './useHealthCheck';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('useHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets healthy state when server returns ok', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'healthy',
        checks: { server: 'ok', database: 'ok' },
        version: '1.0.0',
        uptime: 3600,
      }),
    });

    const { result } = renderHook(() => useHealthCheck());

    // Wait for initial check
    await waitFor(() => expect(result.current.status).not.toBe('unknown'), { timeout: 5000 });

    expect(result.current.status).toBe('healthy');
    expect(result.current.checks.server).toBe('ok');
    expect(result.current.checks.database).toBe('ok');
    expect(result.current.version).toBe('1.0.0');
    expect(result.current.uptime).toBe(3600);
  });

  it('sets degraded state when server returns non-ok', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => expect(result.current.status).toBe('degraded'), { timeout: 5000 });

    expect(result.current.status).toBe('degraded');
  });

  it('sets unknown state when fetch throws', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => expect(result.current.status).toBe('unknown'), { timeout: 5000 });

    expect(result.current.status).toBe('unknown');
  });

  it('has refetch function', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'healthy',
        checks: { server: 'ok', database: 'ok' },
        version: '1.0.0',
        uptime: 100,
      }),
    });

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => expect(result.current.status).toBe('healthy'), { timeout: 5000 });

    // Update mock to return different uptime
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'healthy',
        checks: { server: 'ok', database: 'ok' },
        version: '1.0.0',
        uptime: 200,
      }),
    });

    await reactAct(async () => {
      await result.current.refetch();
    });

    expect(result.current.uptime).toBe(200);
  });
});
