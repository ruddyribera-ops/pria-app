/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_Quiz from './MotorSection_Quiz';
import type { QuizOutput } from '../../types/motor-types';

function makeQuiz(): QuizOutput {
  return {
    quiz: {
      titulo: 'Pop Quiz Fracciones',
      instrucciones: 'Responde cada pregunta',
      preguntas: [
        { numero: 1, tipo: 'opcion_multiple', pregunta: '¿Qué es una fracción?', opciones: ['Parte de un todo', 'Un entero', 'Un número decimal'] },
        { numero: 2, tipo: 'verdadero_falso', pregunta: '1/2 es igual a 0.5', respuesta: 'Verdadero' },
      ],
    },
  } as unknown as QuizOutput;
}

describe('MotorSection_Quiz', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_Quiz result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders quiz header with count', () => {
    render(<MotorSection_Quiz result={makeQuiz()} />);
    expect(screen.getByText('📝 Pop Quiz — 2 preguntas')).toBeTruthy();
  });

  test('renders preguntas', () => {
    render(<MotorSection_Quiz result={makeQuiz()} />);
    expect(screen.getByText(/¿Qué es una fracción?/)).toBeTruthy();
  });

  test('renders opciones', () => {
    render(<MotorSection_Quiz result={makeQuiz()} />);
    expect(screen.getByText(/Parte de un todo.*Un entero.*Un número decimal/)).toBeTruthy();
  });
});
