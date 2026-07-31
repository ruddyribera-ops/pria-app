/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-helpers';
import SemanalPage from './SemanalPage';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { teacher_code: 'TEST' } }),
}));

vi.mock('../api/admin', () => ({
  getAdminUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../hooks/useCurriculum', () => ({
  useCurriculum: () => ({ curriculum: null }),
}));

vi.mock('../hooks/useMotorGenerator', () => ({
  useMotorGenerator: () => ({
    result: null,
    loading: false,
    error: null,
    simulated: false,
    generate: vi.fn(),
  }),
}));

vi.mock('../components/UI/Toast', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => children,
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../api/schedule', () => ({
  getScheduleByDay: vi.fn().mockResolvedValue([]),
  DAYS: ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'],
}));

describe('SemanalPage', () => {
  test('renders Header', async () => {
    renderWithProviders(<SemanalPage />);
    await waitFor(() => {
      expect(screen.getByText(/Plan Semanal/i)).toBeTruthy();
    });
  });
});
