/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
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

vi.mock('../hooks/useMultiPhaseGeneration', () => ({
  useMultiPhaseGeneration: () => ({
    phaseDefs: [], currentPhase: 0, totalPhases: 3,
    phaseStatus: 'idle', phaseStatuses: ['idle', 'idle', 'idle'],
    results: {}, isActive: false, allPhasesDone: false,
    submit: vi.fn(), regenerate: vi.fn(), nextPhase: vi.fn(),
    prevPhase: vi.fn(), goToPhase: vi.fn(), reset: vi.fn(),
    runMultiPhase: vi.fn(), cancel: vi.fn(),
    simulated: false,
  }),
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
