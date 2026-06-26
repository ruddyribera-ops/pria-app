/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

// Mock the auth context
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock LoginForm
vi.mock('../components/Auth/LoginForm', () => ({
  default: ({ onLogin, error, successMessage }: { onLogin: (u: string, p: string) => Promise<void>; error: string | null; successMessage: string | null }) => (
    <div data-testid="login-form">
      <button type="button" onClick={() => onLogin('admin', 'password')}>Login</button>
      {error && <div data-testid="login-error">{error}</div>}
      {successMessage && <div data-testid="login-success">{successMessage}</div>}
    </div>
  ),
}));

describe('LoginPage', () => {
  test('renders LoginForm', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('login-form')).toBeTruthy();
  });

  test('renders with reset success message', () => {
    render(
      <MemoryRouter initialEntries={['/forgot-password?reset=success']}>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('login-success')).toBeTruthy();
  });
});
