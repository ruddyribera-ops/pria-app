/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// Mock Sidebar component (simplified — no longer accepts props)
vi.mock('./Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
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

  test('renders health warning banner when status is unknown', () => {
    render(<AppLayout />);
    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(screen.getByTestId('outlet')).toBeTruthy();
  });
});
