/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhaseStepper from './PhaseStepper';
import type { PhaseDef } from '../../lib/pptx/phaseDefinitions';
import type { PhaseStatus } from '../../hooks/useMultiPhaseGeneration';

// Helper to create mock phase definitions
const createPhases = (): PhaseDef[] => [
  { id: 'phase1', label: 'Fase 1', subtitle: 'Paso 1 de 3', description: 'Desc 1', fields: [], produces: [] },
  { id: 'phase2', label: 'Fase 2', subtitle: 'Paso 2 de 3', description: 'Desc 2', fields: [], produces: [] },
  { id: 'phase3', label: 'Fase 3', subtitle: 'Paso 3 de 3', description: 'Desc 3', fields: [], produces: [] },
];

describe('PhaseStepper', () => {
  test('renders all phase steps', () => {
    const phases = createPhases();
    const phaseStatuses: PhaseStatus[] = ['idle', 'idle', 'idle'];
    
    render(
      <PhaseStepper
        phases={phases}
        currentPhase={0}
        phaseStatuses={phaseStatuses}
        allPhasesDone={false}
      />
    );
    
    expect(screen.getByText('Fase 1')).toBeTruthy();
    expect(screen.getByText('Fase 2')).toBeTruthy();
    expect(screen.getByText('Fase 3')).toBeTruthy();
  });

  test('current phase is highlighted', () => {
    const phases = createPhases();
    const phaseStatuses: PhaseStatus[] = ['idle', 'idle', 'idle'];
    
    render(
      <PhaseStepper
        phases={phases}
        currentPhase={1}
        phaseStatuses={phaseStatuses}
        allPhasesDone={false}
      />
    );
    
    // Check that step 2 shows "En progreso"
    expect(screen.getByText('En progreso')).toBeTruthy();
  });

  test('completed phases have check mark', () => {
    const phases = createPhases();
    const phaseStatuses: PhaseStatus[] = ['done', 'done', 'idle'];
    
    render(
      <PhaseStepper
        phases={phases}
        currentPhase={2}
        phaseStatuses={phaseStatuses}
        allPhasesDone={false}
      />
    );
    
    // The first two should show ✅ (done) - use getAllByText since there are 2
    expect(screen.getAllByText('✅').length).toBe(2);
  });

  test('click on completed phase calls onPhaseClick', async () => {
    const user = userEvent.setup();
    const onPhaseClick = vi.fn();
    const phases = createPhases();
    const phaseStatuses: PhaseStatus[] = ['done', 'idle', 'idle'];
    
    render(
      <PhaseStepper
        phases={phases}
        currentPhase={1}
        phaseStatuses={phaseStatuses}
        allPhasesDone={false}
        onPhaseClick={onPhaseClick}
      />
    );
    
    // Click on the first completed phase (Fase 1)
    const fase1 = screen.getByText('Fase 1');
    await user.click(fase1);
    
    expect(onPhaseClick).toHaveBeenCalledWith(0);
  });

  test('returns null when phases array is empty', () => {
    const { container } = render(
      <PhaseStepper
        phases={[]}
        currentPhase={0}
        phaseStatuses={[]}
        allPhasesDone={false}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  test('shows "Completado" for done phases', () => {
    const phases = createPhases();
    const phaseStatuses: PhaseStatus[] = ['done', 'idle', 'idle'];
    
    render(
      <PhaseStepper
        phases={phases}
        currentPhase={1}
        phaseStatuses={phaseStatuses}
        allPhasesDone={false}
      />
    );
    
    expect(screen.getAllByText('Completado').length).toBe(1);
  });

  test('shows step info for inactive phases', () => {
    const phases = createPhases();
    const phaseStatuses: PhaseStatus[] = ['idle', 'idle', 'idle'];
    
    render(
      <PhaseStepper
        phases={phases}
        currentPhase={0}
        phaseStatuses={phaseStatuses}
        allPhasesDone={false}
      />
    );
    
    // Phase 0 is active (En progreso), phases 1 and 2 are inactive (Paso X de 3)
    expect(screen.getByText('En progreso')).toBeTruthy();
    expect(screen.getByText('Paso 2 de 3')).toBeTruthy();
    expect(screen.getByText('Paso 3 de 3')).toBeTruthy();
  });

  test('click on non-completed phase does not call onPhaseClick', async () => {
    const user = userEvent.setup();
    const onPhaseClick = vi.fn();
    const phases = createPhases();
    const phaseStatuses: PhaseStatus[] = ['idle', 'idle', 'idle'];
    
    render(
      <PhaseStepper
        phases={phases}
        currentPhase={0}
        phaseStatuses={phaseStatuses}
        allPhasesDone={false}
        onPhaseClick={onPhaseClick}
      />
    );
    
    // Click on the current phase (not completed)
    const fase2 = screen.getByText('Fase 2');
    await user.click(fase2);
    
    expect(onPhaseClick).not.toHaveBeenCalled();
  });
});
