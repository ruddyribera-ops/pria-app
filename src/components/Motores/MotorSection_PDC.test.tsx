/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_PDC from './MotorSection_PDC';
import type { PDCOutput } from '../../types/motor-types';

function makePDC(): PDCOutput {
  return {
    pdc: {
      encabezado: {
        materia: 'Matemáticas',
        nivel: 'Secundaria',
        grado: '5to año',
        trimestre: 1,
        ano_escolar: 2024,
      },
      unidades: [
        {
          numero: 1,
          titulo: 'Números y operaciones',
          semanas: 4,
          horas: 16,
          objetivo_holistico: 'Desarrollar pensamiento lógico',
          contenidos: {
            ser: ['Responsabilidad'],
            saber: ['Fracciones'],
            hacer: ['Calcular'],
            decidir: ['Analizar'],
          },
        },
      ],
    },
  } as unknown as PDCOutput;
}

describe('MotorSection_PDC', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_PDC result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders PDC header', () => {
    render(<MotorSection_PDC result={makePDC()} />);
    expect(screen.getByText('📆 Currículo PDC Trimestral')).toBeTruthy();
  });

  test('renders encabezado', () => {
    render(<MotorSection_PDC result={makePDC()} />);
    // Check for the key content parts - text is split across child elements
    expect(screen.getByText(/Matemáticas/)).toBeTruthy();
    expect(screen.getByText(/Secundaria/)).toBeTruthy();
    expect(screen.getByText(/5to año/)).toBeTruthy();
    expect(screen.getByText(/Trimestre 1/)).toBeTruthy();
  });

  test('renders unidad info', () => {
    render(<MotorSection_PDC result={makePDC()} />);
    expect(screen.getByText(/Unidad 1.*Números y operaciones/)).toBeTruthy();
  });
});
