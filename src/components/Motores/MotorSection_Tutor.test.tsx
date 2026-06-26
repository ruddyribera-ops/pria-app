/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_Tutor from './MotorSection_Tutor';
import type { TutorOutput } from '../../types/motor-types';

function makeTutor(): TutorOutput {
  return {
    panel_tutor: {
      resumen_clase: 'La clase fue bien, los estudiantes participan activamente',
      puntos_clave: ['Fracciones', 'Decimales', 'Porcentajes'],
      momentos_criticos: [
        { momento: 'Min 15', accion: 'Explicar concepto', senial: 'Estudiantes confundidos' },
      ],
      adaptaciones_rapidas: [
        { diagnostico: 'Visual learner', intervencion: 'Usar diagrams' },
      ],
    },
  } as TutorOutput;
}

describe('MotorSection_Tutor', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_Tutor result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders tutor header', () => {
    render(<MotorSection_Tutor result={makeTutor()} />);
    expect(screen.getByText('🎓 Panel del Tutor')).toBeTruthy();
  });

  test('renders resumen', () => {
    render(<MotorSection_Tutor result={makeTutor()} />);
    expect(screen.getByText(/La clase fue bien/)).toBeTruthy();
  });

  test('renders puntos clave', () => {
    render(<MotorSection_Tutor result={makeTutor()} />);
    expect(screen.getByText(/Puntos clave:/)).toBeTruthy();
    expect(screen.getByText('Fracciones')).toBeTruthy();
  });

  test('renders momentos criticos', () => {
    render(<MotorSection_Tutor result={makeTutor()} />);
    expect(screen.getByText(/Momentos críticos:/)).toBeTruthy();
  });

  test('renders adaptaciones rapidas', () => {
    render(<MotorSection_Tutor result={makeTutor()} />);
    expect(screen.getByText(/Adaptaciones rápidas:/)).toBeTruthy();
  });
});
