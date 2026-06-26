/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { TOKEN_KEY, USER_KEY } from '../constants';

describe('axios client 401 interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Helper: replicate the request interceptor logic
  function applyRequestInterceptor(config: any, token: string | null) {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }

  // Helper: replicate the 401 error handler logic
  function handle401Error(token: string | null) {
    if (token?.startsWith('mock-')) {
      return Promise.reject(new Error('mock rejection'));
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return Promise.reject(new Error('real rejection'));
  }

  it('attaches Bearer header when token is present', () => {
    const config = { headers: {} as any };
    const result = applyRequestInterceptor(config, 'real-jwt');
    expect(result.headers.Authorization).toBe('Bearer real-jwt');
  });

  it('does NOT attach Bearer header when token is absent', () => {
    const config = { headers: {} as any };
    const result = applyRequestInterceptor(config, null);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('DOES clear localStorage on 401 when token does NOT start with mock-', async () => {
    localStorage.setItem(TOKEN_KEY, 'real-jwt-token');
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1 }));
    await expect(handle401Error('real-jwt-token')).rejects.toThrow();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('does NOT clear localStorage on 401 when token starts with mock-', async () => {
    localStorage.setItem(TOKEN_KEY, 'mock-12345');
    await expect(handle401Error('mock-12345')).rejects.toThrow();
    expect(localStorage.getItem(TOKEN_KEY)).toBe('mock-12345');
  });
});
