/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  const renderForm = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  test('Renders username and password inputs', () => {
    renderForm(<LoginForm onLogin={vi.fn()} error={null} />);
    expect(screen.getByLabelText(/Usuario/i)).toBeTruthy();
    expect(screen.getByLabelText(/Contraseña/i)).toBeTruthy();
  });

  test('Submits with credentials (mock onLogin)', async () => {
    const handleLogin = vi.fn().mockResolvedValue(undefined);
    renderForm(<LoginForm onLogin={handleLogin} error={null} />);

    fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    await waitFor(() => {
      expect(handleLogin).toHaveBeenCalledWith('admin', 'password123');
    });
  });

  test('Shows loading state during submit', async () => {
    const handleLogin = vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 50)));
    renderForm(<LoginForm onLogin={handleLogin} error={null} />);

    fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    expect(screen.getByRole('button', { name: /Ingresando/i })).toBeTruthy();
  });

  test('Shows error message on login failure', async () => {
    const handleLogin = vi.fn().mockRejectedValue(new Error('Credenciales inválidas'));
    renderForm(<LoginForm onLogin={handleLogin} error={null} />);

    fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/Credenciales inválidas/i)).toBeTruthy();
    });
  });

  test('Disables submit button while loading', async () => {
    const handleLogin = vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 100)));
    renderForm(<LoginForm onLogin={handleLogin} error={null} />);

    fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    const btn = screen.getByRole('button', { name: /Ingresando/i });
    expect(btn).toBeDisabled();
  });

  test('Successful login — no error shown', async () => {
    const handleLogin = vi.fn().mockResolvedValue(undefined);
    renderForm(<LoginForm onLogin={handleLogin} error={null} />);

    fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Credenciales/i)).toBeNull();
    });
  });

  test('Shows error prop when provided', () => {
    renderForm(<LoginForm onLogin={vi.fn()} error="Error from parent" />);
    expect(screen.getByText('Error from parent')).toBeTruthy();
  });
});
