/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', nombre: 'Test User', role: 'docente' },
      logout: vi.fn(),
      isAdmin: false,
      isAuthenticated: true,
      isLoading: false,
      token: 'token',
      login: vi.fn(),
    });
  });

  test('Renders brand logo', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('PRIA')).toBeTruthy();
  });

  test('Renders profile name', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getAllByText(/Test User/).length).toBeGreaterThan(0);
  });

  test('Renders the 4 main nav links', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('Inicio')).toBeTruthy();
    expect(screen.getByText('Crear Material')).toBeTruthy();
    expect(screen.getByText('Historial')).toBeTruthy();
    expect(screen.getByText('Configuración')).toBeTruthy();
  });

  test('Non-admin user does not see Admin link', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.queryByText('Panel Admin')).toBeNull();
  });

  test('Admin user sees Admin link', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', nombre: 'Admin User', role: 'admin' },
      logout: vi.fn(),
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      token: 'token',
      login: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Panel Admin')).toBeTruthy();
  });

  test('Renders logout button', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('Cerrar sesión')).toBeTruthy();
  });

  test('Does NOT show old nav items that moved to deep-link', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.queryByText('Mis Clases')).toBeNull();
    expect(screen.queryByText('Nuevo Material')).toBeNull();
    expect(screen.queryByText('Diapositivas')).toBeNull();
    expect(screen.queryByText('Diario')).toBeNull();
    expect(screen.queryByText('Semanal')).toBeNull();
    expect(screen.queryByText('Trimestral')).toBeNull();
    expect(screen.queryByText('Materiales')).toBeNull();
    expect(screen.queryByText('Diagnósticos')).toBeNull();
  });
});
