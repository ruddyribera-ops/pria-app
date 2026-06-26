/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LoginRequest } from '../types';

// Mock client module BEFORE importing auth
vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Import after mock is set up
import { login } from './auth';
import { default as client } from './client';

describe('login with mock fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mock-* token in DEV on network error', async () => {
    vi.stubEnv('DEV', true);
    
    (client.post as any).mockRejectedValue(new Error('Network Error'));
    
    const result = await login({ username: 'admin', password: 'any' } as LoginRequest);
    expect(result.token).toMatch(/^mock-/);
  });

  it('throws in PROD on network error (no mock fallback)', async () => {
    vi.stubEnv('DEV', false);
    
    (client.post as any).mockRejectedValue(new Error('Network Error'));
    
    await expect(login({ username: 'admin', password: 'any' } as LoginRequest)).rejects.toThrow();
  });

  it('returns real token on successful login', async () => {
    vi.stubEnv('DEV', false);
    
    (client.post as any).mockResolvedValue({
      data: {
        data: {
          token: 'real-jwt',
          user: { id: 1, nombre: 'Admin', role: 'admin', nivel: 'primaria', grado: '6to' }
        }
      },
    });
    
    const result = await login({ username: 'admin', password: 'pass' } as LoginRequest);
    expect(result.token).toBe('real-jwt');
  });
});
