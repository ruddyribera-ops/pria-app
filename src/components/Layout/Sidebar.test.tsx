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

// Mock useEstadoSistema
vi.mock('../../hooks/useAdmin', () => ({
  useEstadoSistema: vi.fn(() => ({ data: { motors: {} } })),
}));

// Mock MOTORS
vi.mock('../../api/admin', () => ({
  MOTORS: [
    { key: 'test', label: 'Test Motor', icon: '🔧' },
  ],
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

  test('Renders navigation links', () => {
    render(
      <MemoryRouter>
        <Sidebar nivel="Primaria" grado="5to" onNivelChange={vi.fn()} onGradoChange={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Mis Clases')).toBeTruthy();
    expect(screen.getByText('Nuevo Material')).toBeTruthy();
    expect(screen.getByText('Diapositivas')).toBeTruthy();
  });

  test('Non-admin user does not see Admin link', () => {
    render(
      <MemoryRouter>
        <Sidebar nivel="Primaria" grado="5to" onNivelChange={vi.fn()} onGradoChange={vi.fn()} />
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
        <Sidebar nivel="Primaria" grado="5to" onNivelChange={vi.fn()} onGradoChange={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Panel Admin')).toBeTruthy();
  });

  test('Shows user name and role in profile', () => {
    render(
      <MemoryRouter>
        <Sidebar nivel="Primaria" grado="5to" onNivelChange={vi.fn()} onGradoChange={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Test User/).length).toBeGreaterThan(0);
  });

  test('Shows correct navigation sections', () => {
    render(
      <MemoryRouter>
        <Sidebar nivel="Primaria" grado="5to" onNivelChange={vi.fn()} onGradoChange={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Crear/)).toBeTruthy();
    expect(screen.getByText(/Generación/)).toBeTruthy();
    expect(screen.getByText(/Planificación/)).toBeTruthy();
    expect(screen.getByText(/Recursos/)).toBeTruthy();
  });
});
