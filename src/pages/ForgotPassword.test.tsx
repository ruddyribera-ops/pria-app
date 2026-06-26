/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPassword';

describe('ForgotPasswordPage', () => {
  test('renders form', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Restablecer contraseña/i)).toBeTruthy();
  });

  test('renders email input', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  test('renders submit button', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Enviar enlace/i })).toBeTruthy();
  });
});
