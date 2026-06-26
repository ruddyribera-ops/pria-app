/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_Ficha from './MotorSection_Ficha';
import type { FichaOutput } from '../../types/motor-types';

function makeFicha(): FichaOutput {
  return {
    ficha_trabajo: {
      titulo_gancho: '¡Fracciones al rescate!',
      historia_gancho: 'Era una vez un estudiante que necesitaba entender las fracciones...',
    },
  } as FichaOutput;
}

describe('MotorSection_Ficha', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_Ficha result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders ficha header', () => {
    render(<MotorSection_Ficha result={makeFicha()} />);
    expect(screen.getByText('🎮 Ficha Gamificada')).toBeTruthy();
  });

  test('renders titulo gancho', () => {
    render(<MotorSection_Ficha result={makeFicha()} />);
    expect(screen.getByText('¡Fracciones al rescate!')).toBeTruthy();
  });

  test('renders historia gancho', () => {
    render(<MotorSection_Ficha result={makeFicha()} />);
    expect(screen.getByText(/Era una vez un estudiante/)).toBeTruthy();
  });
});
