/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_ABP from './MotorSection_ABP';
import type { ABPOutput } from '../../types/motor-types';

function makeABP(): ABPOutput {
  return {
    proyecto: {
      titulo: 'Proyecto Fracciones',
      pregunta_generadora: '¿Cómo usamos fracciones en la vida diaria?',
      fases: [
        {
          nombre: 'Exploración',
          duracion: '2 horas',
          actividades: ['Observar recetas', 'Medir ingredientes'],
        },
        {
          nombre: 'Proyecto',
          duracion: '4 horas',
          actividades: ['Crear receta propia'],
        },
      ],
      productos: ['Recetario ilustrado'],
      evaluacion: {
        instrumentos: ['Rúbrica', 'Autoevaluación'],
      },
    },
  } as ABPOutput;
}

describe('MotorSection_ABP', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_ABP result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders project title and pregunta generadora', () => {
    render(<MotorSection_ABP result={makeABP()} />);
    expect(screen.getByText('Proyecto Fracciones')).toBeTruthy();
    expect(screen.getByText(/¿Cómo usamos fracciones/)).toBeTruthy();
  });

  test('renders phases count', () => {
    render(<MotorSection_ABP result={makeABP()} />);
    expect(screen.getByText(/Fases \(2\)/)).toBeTruthy();
  });

  test('renders productos', () => {
    render(<MotorSection_ABP result={makeABP()} />);
    expect(screen.getByText('📦 Recetario ilustrado')).toBeTruthy();
  });
});
