/**
 * SlideCarousel — Navigate between slides in the editor.
 * Shows prev/next buttons with slide labels and total count.
 */

import type { EditorSlide } from './types';

interface SlideCarouselProps {
  slides: EditorSlide[];
  currentIndex: number;
  onGoTo: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
}

export default function SlideCarousel({
  slides, currentIndex, onGoTo, onPrev, onNext, disabled,
}: SlideCarouselProps) {
  if (slides.length === 0) return null;

  const current = slides[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex >= slides.length - 1;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.5rem 0',
    }}>
      {/* Previous button */}
      <button
        onClick={onPrev}
        disabled={isFirst || disabled}
        style={{
          padding: '0.4rem 0.75rem',
          border: '1px solid #d4d4e0',
          borderRadius: '4px',
          background: isFirst ? '#f5f5f7' : '#fff',
          color: isFirst ? '#c0c0d0' : '#1e1e2f',
          cursor: (isFirst || disabled) ? 'not-allowed' : 'pointer',
          fontSize: '0.75rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          transition: 'all 0.15s',
        }}
      >
        ◀ Anterior
      </button>

      {/* Slide info + thumbnails */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.375rem',
        flex: 1, justifyContent: 'center',
      }}>
        {/* Thumbnail dots */}
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => {
              if (!disabled) onGoTo(i);
            }}
            title={`${slide.label} (Slide ${slide.number})`}
            style={{
              width: i === currentIndex ? '2rem' : '0.5rem',
              height: '0.5rem',
              borderRadius: i === currentIndex ? '4px' : '50%',
              border: 'none',
              background: i === currentIndex ? '#3A9E5E' : '#d4d4e0',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              padding: 0,
            }}
          />
        ))}

        {/* Label */}
        <span style={{
          fontSize: '0.7rem', color: '#6b6b80', marginLeft: '0.5rem',
          whiteSpace: 'nowrap',
        }}>
          {current?.label || ''}
          <span style={{ color: '#b0b0c4' }}>
            {' '}· {currentIndex + 1} de {slides.length}
          </span>
        </span>
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={isLast || disabled}
        style={{
          padding: '0.4rem 0.75rem',
          border: '1px solid #d4d4e0',
          borderRadius: '4px',
          background: isLast ? '#f5f5f7' : '#fff',
          color: isLast ? '#c0c0d0' : '#1e1e2f',
          cursor: (isLast || disabled) ? 'not-allowed' : 'pointer',
          fontSize: '0.75rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          transition: 'all 0.15s',
        }}
      >
        Siguiente ▶
      </button>
    </div>
  );
}
