/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotorSection_Synthesis from './MotorSection_Synthesis';
import type { SynthesisOutput } from '../../types/motor-types';

function makeSynthesis(): SynthesisOutput {
  return {
    unidad_sintetizada: {
      titulo: 'Unidad de Fracciones',
      enfoque_didactico: 'Constructivista',
      temas_desarrollados: [{ nombre: 'Fracciones', descripcion: 'Aprender fracciones' }],
    },
  } as unknown as SynthesisOutput;
}

describe('MotorSection_Synthesis', () => {
  test('renders null when curriculumPreview is falsy', () => {
    const { container } = render(
      <MotorSection_Synthesis
        result={null}
        loading={false}
        showToast={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders synthesis header', () => {
    render(
      <MotorSection_Synthesis
        result={makeSynthesis()}
        curriculumPreview={{ unidad_real: 'Test', temas: ['A'], contenido_temas: {}, paginas_temas: {} }}
        loading={false}
        showToast={() => {}}
      />
    );
    expect(screen.getByText('🧠 Síntesis Neuro-Inclusiva')).toBeTruthy();
  });

  test('renders enfoque didactico', () => {
    render(
      <MotorSection_Synthesis
        result={makeSynthesis()}
        curriculumPreview={{ unidad_real: 'Test', temas: ['A'], contenido_temas: {}, paginas_temas: {} }}
        loading={false}
        showToast={() => {}}
      />
    );
    expect(screen.getByText('Enfoque:')).toBeTruthy();
  });

  test('renders ABP button', () => {
    render(
      <MotorSection_Synthesis
        result={makeSynthesis()}
        curriculumPreview={{ unidad_real: 'Test', temas: ['A'], contenido_temas: {}, paginas_temas: {} }}
        loading={false}
        onGenerate={() => {}}
        showToast={() => {}}
      />
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
