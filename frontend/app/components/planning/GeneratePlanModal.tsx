/**
 * GeneratePlanModal Component
 * Modal for initiating auto-generation with real-time progress tracking
 */

'use client';

import React, { useState } from 'react';
import './GeneratePlanModal.css';

interface GeneratePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (pdc_id: string, overrides?: any) => Promise<void>;
  pdcs?: Array<{ id: string; name: string }>;
}

export function GeneratePlanModal({
  isOpen,
  onClose,
  onGenerate,
  pdcs = [],
}: GeneratePlanModalProps) {
  const [selectedPdcId, setSelectedPdcId] = useState<string>('');
  const [overrideGrade, setOverrideGrade] = useState(false);
  const [gradeValue, setGradeValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedPdcId) {
      setError('Selecciona un PDC para generar');
      return;
    }

    try {
      setGenerating(true);
      setProgress(0);
      setError(null);
      setCurrentWeek(null);

      const overrides = overrideGrade && gradeValue ? { grade_level: gradeValue } : undefined;
      await onGenerate(selectedPdcId, overrides);

      setProgress(100);
      setTimeout(() => {
        onClose();
        setSelectedPdcId('');
        setOverrideGrade(false);
        setGradeValue('');
        setProgress(0);
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="generate-plan-overlay" onClick={onClose}>
      <div
        className="generate-plan-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Generar Plan de Enseñanza</h2>

        {!generating ? (
          <>
            <div className="modal-form">
              <div className="form-group">
                <label htmlFor="pdc-select">PDC a Usar</label>
                <select
                  id="pdc-select"
                  value={selectedPdcId}
                  onChange={(e) => setSelectedPdcId(e.target.value)}
                  disabled={generating}
                >
                  <option value="">Selecciona un PDC</option>
                  {pdcs.map((pdc) => (
                    <option key={pdc.id} value={pdc.id}>
                      {pdc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group checkbox">
                <input
                  id="override-grade"
                  type="checkbox"
                  checked={overrideGrade}
                  onChange={(e) => setOverrideGrade(e.target.checked)}
                  disabled={generating}
                />
                <label htmlFor="override-grade">
                  Cambiar nivel de grado
                </label>
              </div>

              {overrideGrade && (
                <div className="form-group">
                  <label htmlFor="grade-input">Nuevo Nivel</label>
                  <input
                    id="grade-input"
                    type="text"
                    value={gradeValue}
                    onChange={(e) => setGradeValue(e.target.value)}
                    placeholder="Ej: Primaria 4"
                    disabled={generating}
                  />
                </div>
              )}

              {error && (
                <div className="error-message">
                  <p>✗ {error}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={onClose}
                disabled={generating}
              >
                Cancelar
              </button>
              <button
                className="btn-generate"
                onClick={handleGenerate}
                disabled={!selectedPdcId || generating}
              >
                ⚡ Generar Ahora
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="progress-section">
              <p className="progress-title">
                Generando semanas de enseñanza...
              </p>
              {currentWeek && (
                <p className="current-week">
                  Procesando Semana {currentWeek}
                </p>
              )}
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="progress-percent">{progress}%</p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={onClose}
                disabled={true}
              >
                Por favor espera...
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
