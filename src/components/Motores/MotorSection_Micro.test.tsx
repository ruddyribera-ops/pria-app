/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_Micro from './MotorSection_Micro';
import type { MicroOutput } from '../../types/motor-types';

function makeMicro(): MicroOutput {
  return {
    micro_objetivos: {
      unidad: 'Matemáticas 5to',
      semanas: [
        {
          semana: 1,
          tema: 'Fracciones básicas',
          objetivos_diarios: [
            { dia: 1, objetivo: 'Identificar mitades y cuartos', criterio_logro: 'Divide figuras en partes iguales' },
            { dia: 2, objetivo: 'Sumar fracciones simples', criterio_logro: 'Suma 1/4 + 1/4 = 1/2' },
          ],
        },
      ],
    },
  } as MicroOutput;
}

describe('MotorSection_Micro', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_Micro result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders micro-objetivos header', () => {
    render(<MotorSection_Micro result={makeMicro()} />);
    expect(screen.getByText('🎯 Micro-Objetivos Diarios')).toBeTruthy();
  });

  test('renders semana and tema', () => {
    render(<MotorSection_Micro result={makeMicro()} />);
    expect(screen.getByText(/Semana 1/)).toBeTruthy();
    expect(screen.getByText(/Fracciones básicas/)).toBeTruthy();
  });

  test('renders objetivos diarios', () => {
    render(<MotorSection_Micro result={makeMicro()} />);
    expect(screen.getByText(/Día 1/)).toBeTruthy();
    expect(screen.getByText(/Identificar mitades y cuartos/)).toBeTruthy();
  });
});
