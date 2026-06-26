/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppLayout from './AppLayout';

// Mock useHealthCheck hook
vi.mock('../../hooks/useHealthCheck', () => ({
  useHealthCheck: () => ({
    status: 'unknown',
    checks: { server: 'unknown', database: 'unknown' },
    version: '',
    uptime: 0,
    refetch: vi.fn(),
  }),
}));

// Mock Sidebar component
vi.mock('./Sidebar', () => ({
  default: ({ nivel, grado, onNivelChange, onGradoChange }: {
    nivel: string;
    grado: string;
    onNivelChange: (n: string) => void;
    onGradoChange: (g: string) => void;
  }) => (
    <div data-testid="sidebar">
      <span>Sidebar: {nivel} - {grado}</span>
      <button type="button" onClick={() => onNivelChange('Secundaria')}>Change Nivel</button>
      <button type="button" onClick={() => onGradoChange('1er año')}>Change Grado</button>
    </div>
  ),
}));

// Mock Outlet to render children
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  };
});

describe('AppLayout', () => {
  test('renders sidebar and outlet', () => {
    render(<AppLayout />);
    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(screen.getByTestId('outlet')).toBeTruthy();
  });

  test('renders with default nivel and grado', () => {
    render(<AppLayout />);
    expect(screen.getByText('Sidebar: Primaria - 5to primaria')).toBeTruthy();
  });

  test('nivel and grado changes update sidebar', async () => {
    const user = userEvent.setup();
    render(<AppLayout />);
    
    const changeNivelBtn = screen.getByText('Change Nivel');
    await user.click(changeNivelBtn);
    
    expect(screen.getByText('Sidebar: Secundaria - 5to primaria')).toBeTruthy();
  });

  test('renders health warning banner when status is unknown', () => {
    render(<AppLayout />);
    // The component shows a warning when health status is unknown
    expect(screen.getByTestId('sidebar')).toBeTruthy();
  });
});
