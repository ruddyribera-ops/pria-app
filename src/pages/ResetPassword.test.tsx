/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { screen } from '@testing-library/react';
import ResetPasswordPage from './ResetPassword';
import { renderWithProviders } from '../test-helpers';

describe('ResetPasswordPage', () => {
  test('renders form with valid token', () => {
    renderWithProviders(
      <ResetPasswordPage />,
      { initialEntries: ['/reset-password?token=abc123'] }
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
  });

  test('renders invalid token message when no token', () => {
    renderWithProviders(<ResetPasswordPage />);
    expect(screen.getByText(/Enlace inválido/i)).toBeTruthy();
  });

  test('renders submit button', () => {
    renderWithProviders(
      <ResetPasswordPage />,
      { initialEntries: ['/reset-password?token=abc123'] }
    );
    expect(screen.getByRole('button', { name: /Restablecer/i })).toBeTruthy();
  });
});
