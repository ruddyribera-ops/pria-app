/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_Slides from './MotorSection_Slides';
import type { SlidesOutput } from '../../types/motor-types';
import type { FidelityReport } from '../../lib/ai/minimaxClient';

function makeSlides(): SlidesOutput {
  return [
    {
      numero: 1,
      tipo: 'portada',
      titulo: 'Fracciones',
      texto_pantalla: 'Bienvenidos',
      guion_docente: 'Saludo inicial',
    },
    {
      numero: 2,
      tipo: 'concepto',
      titulo: '¿Qué es una fracción?',
      texto_pantalla: 'Definición',
      guion_docente: 'Explicar',
    },
  ] as SlidesOutput;
}

function makeFidelity(): FidelityReport {
  return {
    score: 85,
    total_flags: 2,
    warnings: [],
  };
}

describe('MotorSection_Slides', () => {
  test('renders null when result is null', () => {
    const { container } = render(<MotorSection_Slides result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders slides count', () => {
    render(<MotorSection_Slides result={makeSlides()} />);
    expect(screen.getByText('🖼️ Diapositivas (2 slides)')).toBeTruthy();
  });

  test('renders first slide title', () => {
    render(<MotorSection_Slides result={makeSlides()} />);
    expect(screen.getByText('Fracciones')).toBeTruthy();
  });

  test('renders copy prompts button when prompt variations exist', () => {
    const slidesWithPrompts = [
      {
        numero: 1,
        tipo: 'portada' as const,
        titulo: 'Test',
        prompt_imagen_variations: [{ estilo: 'minimal', prompt: 'test', herramienta_recomendada: 'Bing' }],
      },
    ] as unknown as SlidesOutput;
    render(<MotorSection_Slides result={slidesWithPrompts} />);
    expect(screen.getByRole('button', { name: /Copiar 1 prompts/i })).toBeTruthy();
  });

  test('shows fidelity badge when fidelity prop provided', () => {
    render(
      <MotorSection_Slides
        result={makeSlides()}
        fidelity={makeFidelity()}
      />
    );
    expect(screen.getByTestId('fidelity-badge')).toBeTruthy();
  });
});
