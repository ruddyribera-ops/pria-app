/**
 * RegenerateSlideModal — modal for per-slide regeneration with feedback presets.
 *
 * Props:
 *   slideIndex     — 0-based index of the slide being regenerated
 *   totalSlides    — total number of slides in the deck
 *   currentSlide   — the slide object (with titulo, tipo, etc.)
 *   onRegenerate  — async function(feedback: string) to call the API
 *   onClose       — called when modal should close
 *   isRegenerating — true while API call is in progress
 */

import { useState, useRef, useEffect } from 'react';
import Modal from '../UI/Modal';
import type { EditorSlide } from './types';

interface RegenerateSlideModalProps {
  slideIndex: number;
  totalSlides: number;
  currentSlide: EditorSlide;
  onRegenerate: (feedback: string) => Promise<void>;
  onClose: () => void;
  isRegenerating: boolean;
}

interface Preset {
  emoji: string;
  label: string;
  feedback: string;
}

const PRESETS: Preset[] = [
  {
    emoji: '✨',
    label: 'Más simple',
    feedback: 'Hazlo más simple, con menos texto y más visual',
  },
  {
    emoji: '🎉',
    label: 'Más divertido',
    feedback: 'Hazlo más divertido, con un ejemplo cercano a los estudiantes',
  },
  {
    emoji: '📚',
    label: 'Más serio',
    feedback: 'Hazlo más serio y académico, con datos precisos',
  },
  {
    emoji: '💡',
    label: 'Agregar ejemplo',
    feedback: 'Agrega un ejemplo concreto que ilustre el concepto',
  },
  {
    emoji: '🌎',
    label: 'Más cultural',
    feedback: 'Integra más elementos culturales del contexto local',
  },
  {
    emoji: '✏️',
    label: 'Personalizado',
    feedback: '',
  },
];

export default function RegenerateSlideModal({
  slideIndex,
  totalSlides,
  currentSlide,
  onRegenerate,
  onClose,
  isRegenerating,
}: RegenerateSlideModalProps) {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when "Personalizado" is selected
  useEffect(() => {
    if (activePreset === '✏️ Personalizado' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activePreset]);

  const handlePresetClick = (preset: Preset) => {
    setActivePreset(preset.label);
    setFeedback(preset.feedback);
    setError(null);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(e.target.value);
    setActivePreset(null); // User edited manually
    setError(null);
  };

  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      setError('Por favor escribe tu feedback o selecciona una opción');
      return;
    }
    setError(null);
    try {
      await onRegenerate(feedback.trim());
      // Success — parent will close modal
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al regenerar la slide';
      setError(msg);
    }
  };

  // Extract title from current slide
  const slideTitle = currentSlide.elements.find(el => el.type === 'title')?.content
    || currentSlide.label
    || `Slide ${slideIndex + 1}`;

  return (
    <Modal isOpen={true} onClose={onClose} title="🔄 Regenerar esta diapositiva">
      <div style={{ minWidth: '420px' }}>
        {/* Subtitle */}
        <p style={{ fontSize: '0.875rem', color: '#6b6b80', margin: '0 0 1rem 0' }}>
          Slide {slideIndex + 1} de {totalSlides}: <strong style={{ color: '#1e1e2f' }}>{slideTitle}</strong>
        </p>

        {/* Preset buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset)}
              disabled={isRegenerating}
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid',
                borderColor: activePreset === preset.label ? '#3A9E5E' : '#e6e6eb',
                borderRadius: '6px',
                background: activePreset === preset.label ? '#f0f9f4' : '#fff',
                fontSize: '0.8125rem',
                cursor: isRegenerating ? 'not-allowed' : 'pointer',
                color: '#1e1e2f',
                fontWeight: activePreset === preset.label ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                opacity: isRegenerating ? 0.6 : 1,
              }}
            >
              {preset.emoji} {preset.label}
            </button>
          ))}
        </div>

        {/* Feedback textarea */}
        <textarea
          ref={textareaRef}
          value={feedback}
          onChange={handleTextareaChange}
          placeholder="Escribe tu feedback aquí... (ej: 'usa colores más vivos', 'agrega un ejemplo del quebracho')"
          disabled={isRegenerating}
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: error ? '1px solid #e53e3e' : '1px solid #e6e6eb',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: isRegenerating ? 0.6 : 1,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#3A9E5E'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(58,158,94,0.15)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? '#e53e3e' : '#e6e6eb'; e.currentTarget.style.boxShadow = 'none'; }}
        />

        {/* Error message */}
        {error && (
          <p style={{ fontSize: '0.8125rem', color: '#e53e3e', margin: '0.5rem 0 0 0' }}>
            ❌ {error}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isRegenerating}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e6e6eb',
              borderRadius: '6px',
              background: '#fff',
              fontSize: '0.875rem',
              cursor: isRegenerating ? 'not-allowed' : 'pointer',
              color: '#6b6b80',
              opacity: isRegenerating ? 0.6 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating || !feedback.trim()}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px',
              background: !feedback.trim() || isRegenerating ? '#b3b3cc' : '#3A9E5E',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: !feedback.trim() || isRegenerating ? 'not-allowed' : 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {isRegenerating ? '⏳ Regenerando...' : '🔄 Regenerar'}
          </button>
        </div>

        {/* Hint */}
        <p style={{ fontSize: '0.75rem', color: '#b0b0c4', margin: '0.75rem 0 0 0' }}>
          💡 El LLM regenerará solo esta slide en ~60-90 segundos
        </p>
      </div>
    </Modal>
  );
}
