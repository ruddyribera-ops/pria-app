/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SlideGeneratorPage from './SlideGeneratorPage';

vi.mock('../components/Motores/PhaseStepper', () => ({
  default: () => <div data-testid="phase-stepper">Stepper</div>,
}));

vi.mock('../components/Motores/PhaseNavigation', () => ({
  default: () => <div data-testid="phase-nav">Nav</div>,
}));

vi.mock('../components/SlideEditor/ResultPreview', () => ({
  default: () => <div data-testid="result-preview">Preview</div>,
}));

vi.mock('../hooks/useMultiPhaseGeneration', () => ({
  useMultiPhaseGeneration: () => ({
    phaseDefs: [],
    currentPhase: 0,
    totalPhases: 3,
    phaseStatus: 'idle',
    phaseStatuses: ['idle', 'idle', 'idle'],
    results: {},
    isActive: false,
    allPhasesDone: false,
    submit: vi.fn(),
    regenerate: vi.fn(),
    nextPhase: vi.fn(),
    prevPhase: vi.fn(),
    goToPhase: vi.fn(),
    reset: vi.fn(),
    simulated: false,
  }),
}));

vi.mock('../api/motores', () => ({
  createMotorResult: vi.fn().mockResolvedValue({ id: 1 }),
  updateMotorResult: vi.fn().mockResolvedValue(undefined),
}));

describe('SlideGeneratorPage', () => {
  test('renders Header', () => {
    render(
      <MemoryRouter>
        <SlideGeneratorPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Generar Diapositivas/i)).toBeTruthy();
  });

  test('renders PhaseStepper', () => {
    render(
      <MemoryRouter>
        <SlideGeneratorPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('phase-stepper')).toBeTruthy();
  });
});
