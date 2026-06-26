/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhaseHistorySection } from './PhaseHistorySection';
import type { PhaseDef } from '../../lib/pptx/phaseDefinitions';

function makePhaseDefs(): PhaseDef[] {
  return [
    { id: 'phase-1', label: 'Tema', subtitle: 'Define el tema', description: '...', fields: [], produces: 'output' },
    { id: 'phase-2', label: 'Objetivos', subtitle: 'Define objetivos', description: '...', fields: [], produces: 'output' },
    { id: 'phase-3', label: 'Actividades', subtitle: 'Define actividades', description: '...', fields: [], produces: 'output' },
  ];
}

describe('PhaseHistorySection', () => {
  test('returns null when currentPhase <= 0', () => {
    const { container } = render(
      <PhaseHistorySection
        phaseDefs={makePhaseDefs()}
        currentPhase={0}
        results={{}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders details with correct phase count', () => {
    render(
      <PhaseHistorySection
        phaseDefs={makePhaseDefs()}
        currentPhase={2}
        results={{ 'phase-1': { title: 'Test' }, 'phase-2': { desc: 'Desc' } }}
      />
    );
    expect(screen.getByText(/Ver contenido de fases anteriores/)).toBeTruthy();
  });

  test('renders phase labels when results exist', () => {
    render(
      <PhaseHistorySection
        phaseDefs={makePhaseDefs()}
        currentPhase={3}
        results={{
          'phase-1': { title: 'Tema A' },
          'phase-2': { desc: 'Description' },
        }}
      />
    );
    expect(screen.getByText('Tema')).toBeTruthy();
    expect(screen.getByText('Objetivos')).toBeTruthy();
  });
});
