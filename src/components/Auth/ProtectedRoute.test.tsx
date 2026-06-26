/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { TOKEN_KEY, USER_KEY } from '../../constants';

// Mock the AuthContext hooks
const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isAdmin: false,
      user: null,
      token: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isAdmin: false,
      user: { id: '1', nombre: 'Test', role: 'docente' },
      token: 'token',
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeTruthy();
  });

  test('Redirects to /login when not authenticated', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Should redirect - content not visible
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  test('Checks localStorage for auth state', () => {
    // Set localStorage to simulate stored session
    localStorage.setItem(TOKEN_KEY, 'mock-token');
    localStorage.setItem(USER_KEY, JSON.stringify({ id: '1', nombre: 'Test', role: 'docente' }));

    // Even if context says not authenticated, localStorage check should allow access
    mockUseAuth.mockReturnValue({
      isAuthenticated: false, // context says not ready
      isLoading: false,
      isAdmin: false,
      user: null,
      token: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Should render because localStorage has valid session
    expect(screen.getByText('Protected Content')).toBeTruthy();
  });

  test('Shows loading state when isLoading=true', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      isAdmin: false,
      user: null,
      token: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Cargando...')).toBeTruthy();
  });
});
