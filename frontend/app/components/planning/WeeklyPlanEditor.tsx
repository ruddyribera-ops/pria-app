/**
 * WeeklyPlanEditor Component
 * Allows editing of week metadata and management of 3 momentos
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Week } from '@/app/lib/types/planning';
import { MomentosEditor } from './MomentosEditor';
import './WeeklyPlanEditor.css';

interface WeeklyPlanEditorProps {
  week: Week | null;
  loading: boolean;
  onSave: (week_id: string, data: any) => Promise<any>;
  onMomentoUpdate: (week_id: string, momento_id: string, data: any) => Promise<any>;
}

export function WeeklyPlanEditor({
  week,
  loading,
  onSave,
  onMomentoUpdate,
}: WeeklyPlanEditorProps) {
  const [subject, setSubject] = useState(week?.subject || '');
  const [gradeLevel, setGradeLevel] = useState(week?.grade_level || '');
  const [status, setStatus] = useState<'draft' | 'published' | 'completed'>(
    week?.status || 'draft'
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedMomentoId, setSelectedMomentoId] = useState<string | null>(null);

  // Sync form state when week changes
  React.useEffect(() => {
    if (week) {
      setSubject(week.subject);
      setGradeLevel(week.grade_level);
      setStatus(week.status);
      setSaveStatus('idle');
      setErrorMessage(null);
    }
  }, [week]);

  const handleSave = useCallback(async () => {
    if (!week) return;

    try {
      setSaving(true);
      setSaveStatus('saving');
      setErrorMessage(null);

      await onSave(week.id, {
        subject,
        grade_level: gradeLevel,
        status,
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      setErrorMessage(msg);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [week, subject, gradeLevel, status, onSave]);

  if (!week) {
    return (
      <div className="weekly-plan-editor empty-state">
        <p>Selecciona una semana para comenzar a editar</p>
      </div>
    );
  }

  return (
    <div className="weekly-plan-editor">
      {/* Header */}
      <div className="editor-header">
        <h3>Semana {week.number} — Editar Plan</h3>
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

      {/* Metadata form */}
      <div className="editor-section">
        <h4>Información de la Semana</h4>
        <div className="form-group">
          <label htmlFor="subject">Asignatura</label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: Matemática, Lengua"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="gradeLevel">Nivel</label>
            <input
              id="gradeLevel"
              type="text"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="Ej: Primaria 3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Estado</label>
            <select
              id="status"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as 'draft' | 'published' | 'completed'
                )
              }
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="completed">Completado</option>
            </select>
          </div>
        </div>

        <button
          className="btn-save"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Momentos section */}
      <div className="editor-section">
        <h4>Momentos Pedagógicos (Inicio, Desarrollo, Cierre)</h4>
        <div className="momentos-grid">
          {week.momentos && week.momentos.length > 0 ? (
            week.momentos.map((momento) => (
              <div
                key={momento.id}
                className={`momento-card ${
                  selectedMomentoId === momento.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedMomentoId(momento.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedMomentoId(momento.id);
                  }
                }}
              >
                <div className="momento-name">{momento.nombre}</div>
                <div className="momento-duration">
                  ⏱ {momento.duration_minutes} min
                </div>
                <div className="momento-preview">
                  {momento.content_text
                    ? momento.content_text.substring(0, 50) + '...'
                    : 'Sin contenido'}
                </div>
              </div>
            ))
          ) : (
            <p className="no-momentos">No hay momentos asociados a esta semana</p>
          )}
        </div>
      </div>

      {/* Momento detail editor modal */}
      {selectedMomentoId && week.momentos && (() => {
        const selectedMomento = week.momentos?.find(
          (m) => m.id === selectedMomentoId
        );
        if (selectedMomento) {
          return (
            <MomentosEditor
              momento={selectedMomento}
              weekId={week.id}
              onSave={(data) => {
                onMomentoUpdate(week.id, selectedMomentoId, data);
                setSelectedMomentoId(null);
              }}
              onClose={() => setSelectedMomentoId(null)}
            />
          );
        }
        return null;
      })()}
    </div>
  );
}
