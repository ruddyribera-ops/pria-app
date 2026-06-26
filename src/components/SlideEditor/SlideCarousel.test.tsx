/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SlideCarousel from './SlideCarousel';
import type { EditorSlide } from './types';

function makeSlides(): EditorSlide[] {
  return [
    { id: 's1', type: 'cover', label: 'Portada', number: 1, elements: [] },
    { id: 's2', type: 'content', label: 'Objetivos', number: 2, elements: [] },
    { id: 's3', type: 'content', label: 'Contenido', number: 3, elements: [] },
  ];
}

describe('SlideCarousel', () => {
  test('renders null when slides is empty', () => {
    const { container } = render(
      <SlideCarousel slides={[]} currentIndex={0} onGoTo={vi.fn()} onPrev={vi.fn()} onNext={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders prev and next buttons', () => {
    render(
      <SlideCarousel
        slides={makeSlides()}
        currentIndex={1}
        onGoTo={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Anterior/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Siguiente/i })).toBeTruthy();
  });

  test('prev button disabled on first slide', () => {
    render(
      <SlideCarousel
        slides={makeSlides()}
        currentIndex={0}
        onGoTo={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    const prevBtn = screen.getByRole('button', { name: /Anterior/i });
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
  });

  test('next button disabled on last slide', () => {
    render(
      <SlideCarousel
        slides={makeSlides()}
        currentIndex={2}
        onGoTo={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
    expect((nextBtn as HTMLButtonElement).disabled).toBe(true);
  });

  test('calls onPrev when Anterior clicked', () => {
    const handlePrev = vi.fn();
    render(
      <SlideCarousel
        slides={makeSlides()}
        currentIndex={1}
        onGoTo={vi.fn()}
        onPrev={handlePrev}
        onNext={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Anterior/i }));
    expect(handlePrev).toHaveBeenCalledTimes(1);
  });

  test('calls onNext when Siguiente clicked', () => {
    const handleNext = vi.fn();
    render(
      <SlideCarousel
        slides={makeSlides()}
        currentIndex={1}
        onGoTo={vi.fn()}
        onPrev={vi.fn()}
        onNext={handleNext}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  test('renders slide count label', () => {
    render(
      <SlideCarousel
        slides={makeSlides()}
        currentIndex={1}
        onGoTo={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByText(/2 de 3/)).toBeTruthy();
  });
});
