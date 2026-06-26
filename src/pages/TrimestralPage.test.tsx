/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrimestralPage from './TrimestralPage';

vi.mock('../hooks/useMultiPhaseGeneration', () => ({
  useMultiPhaseGeneration: () => ({
    phaseDefs: [],
    currentPhase: 0,
    totalPhases: 2,
    phaseStatus: 'idle',
    phaseStatuses: ['idle', 'idle'],
    results: {},
    isActive: false,
    allPhasesDone: false,
    submit: vi.fn(),
    regenerate: vi.fn(),
    nextPhase: vi.fn(),
    prevPhase: vi.fn(),
    goToPhase: vi.fn(),
    reset: vi.fn(),
    currentResult: null,
  }),
}));

vi.mock('../hooks/useCurriculum', () => ({
  useCurriculum: () => ({ curriculum: null }),
}));

vi.mock('../components/SlideEditor/ResultPreview', () => ({
  default: () => <div>Preview</div>,
}));

describe('TrimestralPage', () => {
  test('renders Header', async () => {
    render(
      <MemoryRouter>
        <TrimestralPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Planificación Trimestral/i)).toBeTruthy();
    });
  });
});
