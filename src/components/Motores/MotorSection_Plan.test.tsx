/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_Plan from './MotorSection_Plan';
import type { PlanOutput } from '../../types/motor-types';

function makePlan(): PlanOutput {
  return {
    secuencia_didactica: {
      bloques: [
        {
          nombre: 'Inicio',
          duracion: 10,
          objetivo: 'Activating prior knowledge',
          actividad: 'Review fractions with visual aids',
          nota: 'Use manipulatives',
        },
        {
          nombre: 'Desarrollo',
          duracion: 25,
          objetivo: 'Introduce new concepts',
          actividad: 'Guided practice',
        },
      ],
    },
    inteligencias_multiples: [
      { inteligencia: 'Visual-espacial', nivel: 'Alto' },
      { inteligencia: 'Lógico-matemática', nivel: 'Medio' },
    ],
    mapa_cognitivo: [],
  } as unknown as PlanOutput;
}

describe('MotorSection_Plan', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_Plan result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders plan header', () => {
    render(<MotorSection_Plan result={makePlan()} />);
    expect(screen.getByText('📋 Plan de Clase')).toBeTruthy();
  });

  test('renders bloques', () => {
    render(<MotorSection_Plan result={makePlan()} />);
    expect(screen.getByText(/Inicio.*10 min/)).toBeTruthy();
    expect(screen.getByText(/Desarrollo.*25 min/)).toBeTruthy();
  });

  test('renders inteligencias multiples', () => {
    render(<MotorSection_Plan result={makePlan()} />);
    expect(screen.getByText(/Inteligencias:.*Visual-espacial.*Lógico-matemática/)).toBeTruthy();
  });
});
