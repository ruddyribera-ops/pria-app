/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_Recalibrate from './MotorSection_Recalibrate';
import type { RecalibrateOutput } from '../../types/motor-types';

function makeRecalibrate(): RecalibrateOutput {
  return {
    recalibracion: {
      diagnostico_general: 'Student shows strong visual learning preference',
      fortalezas: ['Visual learner', 'Good with diagrams'],
      areas_mejora: ['Abstract reasoning'],
      ajustes_sugeridos: [
        { area: 'Instruction', accion: 'Use more visual aids', impacto_esperado: 'High' },
      ],
    },
  } as RecalibrateOutput;
}

describe('MotorSection_Recalibrate', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_Recalibrate result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders recalibracion header', () => {
    render(<MotorSection_Recalibrate result={makeRecalibrate()} />);
    expect(screen.getByText('🔄 Recalibración Adaptativa')).toBeTruthy();
  });

  test('renders diagnostico general', () => {
    render(<MotorSection_Recalibrate result={makeRecalibrate()} />);
    expect(screen.getByText(/Student shows strong visual/)).toBeTruthy();
  });

  test('renders fortalezas', () => {
    render(<MotorSection_Recalibrate result={makeRecalibrate()} />);
    expect(screen.getByText(/✓ Fortalezas:/)).toBeTruthy();
  });

  test('renders ajustes sugeridos', () => {
    render(<MotorSection_Recalibrate result={makeRecalibrate()} />);
    expect(screen.getByText(/Ajuste sugerido:/)).toBeTruthy();
    // Text spans sibling elements, check separately
    expect(screen.getByText(/Instruction:/)).toBeTruthy();
    expect(screen.getByText(/Use more visual aids/)).toBeTruthy();
  });
});
