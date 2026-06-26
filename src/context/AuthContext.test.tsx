/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { TOKEN_KEY, USER_KEY } from '../constants';

// Mock auth API
vi.mock('../api/auth', () => ({
  login: vi.fn(),
  getMe: vi.fn(),
}));

import { login as apiLogin, getMe } from '../api/auth';

describe('AuthContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Initial state when localStorage is empty', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // With no stored token, setIsLoading(false) runs synchronously in the useEffect
    // else-branch — no intermediate loading state is observable.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('login(user, token) updates state and persists to localStorage', async () => {
    const mockUser = { id: 1, nombre: 'Test User', role: 'docente' as const, nivel: 'primaria', grado: '1ro', teacher_code: 'T1' };
    (apiLogin as any).mockResolvedValue({ token: 'jwt-token-123', user: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('testuser', 'password123');
    });

    expect(result.current.token).toBe('jwt-token-123');
    expect(result.current.user?.nombre).toBe('Test User');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-token-123');
    expect(localStorage.getItem(USER_KEY)).toContain('Test User');
  });

  it('logout() clears localStorage and resets state', async () => {
    // Set up initial logged-in state via localStorage
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, nombre: 'Existing', role: 'docente', nivel: 'primaria', grado: '1ro', teacher_code: 'T1' }));
    (getMe as any).mockResolvedValue({ id: 1, nombre: 'Existing', role: 'docente', nivel: 'primaria', grado: '1ro', teacher_code: 'T1' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify logged in state
    expect(result.current.token).toBe('existing-token');

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('getMe() on mount with valid token → sets user', async () => {
    const mockUser = { id: 2, nombre: 'Admin User', role: 'admin' as const, nivel: 'primaria', grado: '6to', teacher_code: 'ADMIN' };
    localStorage.setItem(TOKEN_KEY, 'valid-token');
    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    (getMe as any).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user?.nombre).toBe('Admin User');
    expect(result.current.token).toBe('valid-token');
    expect(getMe).toHaveBeenCalled();
  });

  it('getMe() on mount with invalid token → clears localStorage', async () => {
    const mockUser = { id: 3, nombre: 'Old User', role: 'docente' as const, nivel: 'secundaria', grado: '3ro', teacher_code: 'T3' };
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    (getMe as any).mockRejectedValue(new Error('Invalid token'));

    // Spy on window.location
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      pathname: '/dashboard',
    } as Location);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();

    locationSpy.mockRestore();
  });

  it('isAdmin is true when user.role === admin', async () => {
    const mockUser = { id: 1, nombre: 'Admin', role: 'admin' as const, nivel: 'primaria', grado: '6to', teacher_code: 'ADMIN' };
    localStorage.setItem(TOKEN_KEY, 'admin-token');
    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    (getMe as any).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
  });

  it('login throws when API fails and not in DEV mode', async () => {
    vi.stubEnv('DEV', false);
    (apiLogin as any).mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.login('user', 'pass')).rejects.toThrow('Server error');
    });

    vi.stubEnv('DEV', true); // reset
  });
});
