/**
 * useSlideEditor — manages inline slide editing state with debounced auto-save.
 *
 * Handles:
 * - Debounced auto-save (1500ms after last keystroke)
 * - Save status tracking (idle | saving | saved | error)
 * - Add/remove slides
 * - Backend persistence via PATCH /api/motores/slides/:id
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { patchSlides, fetchLatestSlidesResultId } from '../api/slides';
import type { SlidesOutput, SlideItem } from '../types/motor-types';

// ── Types ────────────────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseSlideEditorOptions {
  /** Initial slides array */
  initialSlides: SlidesOutput;
  /** Called when quality scores are updated from the server */
  onQualityUpdate?: (quality: unknown) => void;
  /** Called on save error with the error message */
  onSaveError?: (message: string) => void;
  /** Called when save succeeds */
  onSaveSuccess?: () => void;
}

// ── Slide template by type ───────────────────────────────────────────────────

const SLIDE_TEMPLATES: Record<string, Partial<SlideItem>> = {
  portada: {
    tipo: 'portada',
    titulo: 'Nueva diapositiva',
    texto_pantalla: 'Título de la presentación',
    guion_docente: '',
    callout: undefined,
  },
  objetivos: {
    tipo: 'objetivos',
    titulo: 'Objetivos de aprendizaje',
    texto_pantalla: 'Al finalizar esta lección, el estudiante será capaz de:',
    guion_docente: 'Presenta los objetivos al inicio de la clase.',
    callout: undefined,
  },
  concepto: {
    tipo: 'concepto',
    titulo: 'Concepto clave',
    texto_pantalla: 'Explica el concepto de forma clara y sencilla.',
    guion_docente: 'Desarrolla este concepto con ejemplos de la vida real.',
    callout: undefined,
  },
  ejemplo: {
    tipo: 'concepto',
    titulo: 'Ejemplo práctico',
    texto_pantalla: 'Observa el siguiente ejemplo:',
    guion_docente: 'Trabaja este ejemplo junto con los estudiantes.',
    callout: undefined,
  },
  practica: {
    tipo: 'concepto',
    titulo: 'Actividad de práctica',
    texto_pantalla: 'Ahora es tu turno de practicar.',
    guion_docente: 'Pide a los estudiantes que completen esta actividad.',
    callout: undefined,
  },
  pausa: {
    tipo: 'pausa',
    titulo: 'Pausa activa',
    texto_pantalla: 'Levántate y estírate. Respira profundo.',
    guion_docente: 'Da 2-3 minutos para que los estudiantes descansen.',
    callout: undefined,
  },
  cierre: {
    tipo: 'cierre',
    titulo: 'Resumen y cierre',
    texto_pantalla: 'Hoy aprendimos sobre...',
    guion_docente: 'Cierra la clase reforzando los conceptos clave.',
    callout: undefined,
  },
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSlideEditor({ initialSlides, onQualityUpdate, onSaveError, onSaveSuccess }: UseSlideEditorOptions) {
  const [slides, setSlides] = useState<SlidesOutput>(initialSlides);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<number | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSlidesRef = useRef<SlidesOutput | null>(null);
  const saveInFlightRef = useRef<boolean>(false);

  // Fetch the latest motor result ID on mount (when we need it for PATCH)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await fetchLatestSlidesResultId();
      if (!cancelled) {
        setResultId(id);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Core save function ─────────────────────────────────────────────────────

  const saveToBackend = useCallback(async (slidesToSave: SlidesOutput) => {
    if (resultId === null) {
      // Try to get ID again
      const id = await fetchLatestSlidesResultId();
      if (id === null) {
        setError('No se encontró el resultado. Guarda los cambios localmente.');
        setStatus('error');
        return;
      }
      setResultId(id);
    }

    try {
      const response = await patchSlides(resultId ?? 0, slidesToSave);
      setError(null);
      setStatus('saved');
      onQualityUpdate?.(response.quality);
      onSaveSuccess?.();

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      setError(message);
      setStatus('error');
      onSaveError?.(message);
    } finally {
      saveInFlightRef.current = false;
    }
  }, [resultId, onQualityUpdate, onSaveError, onSaveSuccess]);

  // ── Debounced save ─────────────────────────────────────────────────────────

  const debouncedSave = useCallback((slidesToSave: SlidesOutput) => {
    // Clear any pending timer
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    pendingSlidesRef.current = slidesToSave;
    setStatus('saving');

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void saveToBackend(slidesToSave);
    }, 1500);
  }, [saveToBackend]);

  // ── Update a single field (triggers debounced auto-save) ─────────────────

  const updateSlide = useCallback((index: number, updates: Partial<SlideItem>) => {
    setSlides(prev => {
      const updated = prev.map((slide, i) =>
        i === index ? { ...slide, ...updates } : slide
      );
      // Trigger debounced save
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  // ── Add a new slide ───────────────────────────────────────────────────────

  const addSlide = useCallback((tipo: keyof typeof SLIDE_TEMPLATES) => {
    const template = SLIDE_TEMPLATES[tipo];
    if (!template) return;

    const maxNum = slides.reduce((max, s) => Math.max(max, s.numero ?? 0), 0);

    const newSlide: SlideItem = {
      numero: maxNum + 1,
      tipo: (template.tipo ?? tipo) as SlideItem['tipo'],
      titulo: template.titulo ?? '',
      texto_pantalla: template.texto_pantalla ?? '',
      guion_docente: template.guion_docente ?? '',
      prompt_imagen: undefined,
      callout: template.callout,
      mnemonic: undefined,
    };

    const updated = [...slides, newSlide];
    setSlides(updated);
    debouncedSave(updated);
  }, [slides, debouncedSave]);

  // ── Remove a slide ────────────────────────────────────────────────────────

  const removeSlide = useCallback((index: number) => {
    if (slides.length <= 1) {
      setError('No se puede eliminar la última diapositiva.');
      setStatus('error');
      return;
    }

    const updated = slides.filter((_, i) => i !== index)
      // Re-number slides after removal
      .map((slide, i) => ({ ...slide, numero: i + 1 }));

    setSlides(updated);
    debouncedSave(updated);
  }, [slides, debouncedSave]);

  // ── Immediate save (manual trigger via button) ─────────────────────────────

  const saveNow = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void saveToBackend(slides);
  }, [slides, saveToBackend]);

  // ── Retry last failed save ────────────────────────────────────────────────

  const retrySave = useCallback(() => {
    if (pendingSlidesRef.current) {
      void saveToBackend(pendingSlidesRef.current);
    } else {
      void saveToBackend(slides);
    }
  }, [slides, saveToBackend]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    slides,
    status,
    error,
    resultId,
    updateSlide,
    addSlide,
    removeSlide,
    saveNow,
    retrySave,
  };
}
