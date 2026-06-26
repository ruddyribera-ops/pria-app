/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_Assessment from './MotorSection_Assessment';
import type { AssessmentOutput } from '../../types/motor-types';

function makeAssessment(): AssessmentOutput {
  return {
    evaluacion: {
      proyecto: 'Matemáticas 5to',
      rubrica: {
        criterios: [
          { nombre: 'Participación', peso: '20%', niveles: { excelente: 'Participa activamente', suficiente: 'Participa', en_desarrollo: 'Partial', inicial: 'None' } },
        ],
      },
      autoevaluacion: {
        preguntas: ['¿Qué aprendiste?', '¿Qué fue difícil?'],
        reflexion: [],
      },
      coevaluacion: {
        preguntas: [],
      },
    },
  } as unknown as AssessmentOutput;
}

describe('MotorSection_Assessment', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_Assessment result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders section header', () => {
    render(<MotorSection_Assessment result={makeAssessment()} />);
    expect(screen.getByText('📊 Rúbrica y Evaluación')).toBeTruthy();
  });

  test('renders criterios count', () => {
    render(<MotorSection_Assessment result={makeAssessment()} />);
    expect(screen.getByText(/Criterios \(1\)/)).toBeTruthy();
  });

  test('renders autoevaluacion', () => {
    render(<MotorSection_Assessment result={makeAssessment()} />);
    expect(screen.getByText(/Autoevaluación:/)).toBeTruthy();
  });
});
