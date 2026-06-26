/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MotorButtonRow from './MotorButtonRow';
import type { CurriculumResult } from '../../lib/ingest/types';

function makeCurriculumPreview(): CurriculumResult {
  return {
    unidad_real: 'Matemáticas 5to',
    temas: ['Fracciones', 'Decimales'],
    contenido_temas: {},
    paginas_temas: {},
  };
}

describe('MotorButtonRow', () => {
  test('renders both motor buttons when curriculumPreview has temas', () => {
    render(
      <MotorButtonRow
        curriculumPreview={makeCurriculumPreview()}
        synthesis={null}
        slidesLoading={false}
        fichaLoading={false}
      />
    );
    // Both buttons should be rendered
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });

  test('calls onGenerateSlides when first button is clicked', () => {
    const handleSlides = vi.fn();
    render(
      <MotorButtonRow
        curriculumPreview={makeCurriculumPreview()}
        synthesis={null}
        onGenerateSlides={handleSlides}
        slidesLoading={false}
        fichaLoading={false}
      />
    );
    // First button is slides
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(handleSlides).toHaveBeenCalledTimes(1);
  });

  test('calls onGenerateFicha when second button is clicked', () => {
    const handleFicha = vi.fn();
    render(
      <MotorButtonRow
        curriculumPreview={makeCurriculumPreview()}
        synthesis={null}
        onGenerateFicha={handleFicha}
        slidesLoading={false}
        fichaLoading={false}
      />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(handleFicha).toHaveBeenCalledTimes(1);
  });

  test('shows loading state without crashing', () => {
    render(
      <MotorButtonRow
        curriculumPreview={makeCurriculumPreview()}
        synthesis={null}
        onGenerateSlides={() => {}}
        slidesLoading={true}
        fichaLoading={true}
      />
    );
    // Both buttons should still render in loading state
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });
});
