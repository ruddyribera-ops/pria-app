/**
 * MomentosEditor Component
 * Modal/slide-out form for editing individual Momento
 * Includes auto-save to localStorage and character count warning
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Momento, UpdateMomentoRequest } from '@/app/lib/types/planning';
import './MomentosEditor.css';

interface MomentosEditorProps {
  momento: Momento;
  weekId: string;
  onSave: (data: UpdateMomentoRequest) => Promise<any> | void;
  onClose: () => void;
}

const DEFAULT_DURATIONS = {
  Inicio: 15,
  Desarrollo: 20,
  Cierre: 10,
};

export function MomentosEditor({
  momento,
  weekId,
  onSave,
  onClose,
}: MomentosEditorProps) {
  const [duration, setDuration] = useState(momento.duration_minutes);
  const [content, setContent] = useState(momento.content_text);
  const [recursos, setRecursos] = useState(
    momento.recursos.join(', ')
  );
  const [evaluacion, setEvaluacion] = useState(momento.evaluacion);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save draft to localStorage every 300ms (debounced)
  useEffect(() => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    draftTimeoutRef.current = setTimeout(() => {
      const draftKey = `momento_draft_${weekId}_${momento.id}`;
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          duration,
          content,
          recursos,
          evaluacion,
          savedAt: new Date().toISOString(),
        })
      );
    }, 300);

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [duration, content, recursos, evaluacion, weekId, momento.id]);

  // Calculate word count
  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setSaveStatus('saving');
      setErrorMessage(null);

      const data: UpdateMomentoRequest = {
        nombre: momento.nombre,
        duration_minutes: duration,
        content_text: content,
        recursos: recursos
          .split(',')
          .map((r) => r.trim())
          .filter((r) => r.length > 0),
        evaluacion,
      };

      await onSave(data);

      setSaveStatus('success');
      // Clear draft from localStorage on successful save
      localStorage.removeItem(`momento_draft_${weekId}_${momento.id}`);
      setTimeout(() => {
        setSaveStatus('idle');
        onClose();
      }, 1000);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error al guardar';
      setErrorMessage(msg);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [
    momento.nombre,
    duration,
    content,
    recursos,
    evaluacion,
    onSave,
    weekId,
    momento.id,
    onClose,
  ]);

  const handleCancel = () => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }
    onClose();
  };

  // Handle key shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div className="momentos-editor-overlay" onClick={handleCancel}>
      <div
        className="momentos-editor-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="editor-modal-header">
          <div>
            <h3>{momento.nombre}</h3>
            <p className="momento-subtitle">Editar contenido pedagógico</p>
          </div>
          <button
            className="btn-close"
            onClick={handleCancel}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="error-banner">
            <p>{errorMessage}</p>
            <button
              className="btn-close-error"
              onClick={() => setErrorMessage(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Form */}
        <div className="editor-modal-content">
          {/* Duration */}
          <div className="form-group">
            <label htmlFor="duration">Duración (minutos)</label>
            <div className="duration-input">
              <input
                id="duration"
                type="number"
                min="5"
                max="120"
                value={duration}
                onChange={(e) =>
                  setDuration(Math.max(5, parseInt(e.target.value) || 0))
                }
              />
              <button
                className="btn-reset-duration"
                onClick={() =>
                  setDuration(
                    DEFAULT_DURATIONS[
                      momento.nombre as keyof typeof DEFAULT_DURATIONS
                    ] || 15
                  )
                }
                title="Restaurar duración predeterminada"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="form-group">
            <div className="label-with-counter">
              <label htmlFor="content">Contenido Pedagógico</label>
              <div className="word-counter">
                {wordCount} palabras
                {wordCount > 500 && (
                  <span className="warning">⚠ Muy largo</span>
                )}
              </div>
            </div>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe el contenido del momento pedagógico. Puedes usar markdown."
              rows={8}
              className={wordCount > 500 ? 'warning' : ''}
            />
            <p className="help-text">
              Máximo recomendado: 500 palabras
            </p>
          </div>

          {/* Recursos */}
          <div className="form-group">
            <label htmlFor="recursos">Recursos (separados por coma)</label>
            <input
              id="recursos"
              type="text"
              value={recursos}
              onChange={(e) => setRecursos(e.target.value)}
              placeholder="Ej: proyector, pizarra, hojas de papel, lápices de color"
            />
          </div>

          {/* Evaluación */}
          <div className="form-group">
            <label htmlFor="evaluacion">Estrategia de Evaluación</label>
            <textarea
              id="evaluacion"
              value={evaluacion}
              onChange={(e) => setEvaluacion(e.target.value)}
              placeholder="¿Cómo evaluar si los estudiantes lograron los objetivos?"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="editor-modal-footer">
          <div className="save-status">
            {saveStatus === 'saving' && (
              <span className="status-indicator saving">⟳ Guardando...</span>
            )}
            {saveStatus === 'success' && (
              <span className="status-indicator success">✓ Guardado</span>
            )}
            {saveStatus === 'error' && (
              <span className="status-indicator error">✗ Error</span>
            )}
          </div>
          <div className="button-group">
            <button
              className="btn-cancel"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Draft indicator */}
        <div className="draft-indicator">
          💾 Borrador guardado automáticamente
        </div>
      </div>
    </div>
  );
}
