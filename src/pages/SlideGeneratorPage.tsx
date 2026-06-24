import { useState, useCallback, useMemo } from 'react';
import Header from '../components/Layout/Header';
import PhaseStepper from '../components/Motores/PhaseStepper';
import PhaseNavigation from '../components/Motores/PhaseNavigation';
import SlideEditorPanel, { type MergedData } from '../components/SlideEditor/SlideEditorPanel';
import ResultPreview from '../components/SlideEditor/ResultPreview';
import { useMultiPhaseGeneration } from '../hooks/useMultiPhaseGeneration';
import { mergePhaseResults } from '../lib/pptx/multiPhaseContent';
import type { PhaseField } from '../lib/pptx/phaseDefinitions';
import { createMotorResult, updateMotorResult } from '../api/motores';
import styles from './SlideGeneratorPage.module.css';

export default function SlideGeneratorPage() {
  const [motorParams, setMotorParams] = useState<Record<string, unknown>>({});
  const [showEditor, setShowEditor] = useState(false);
  const [currentResultId, setCurrentResultId] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem('currentResultId');
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const updateResultId = (id: number | null) => {
    setCurrentResultId(id);
    try {
      if (id !== null) sessionStorage.setItem('currentResultId', String(id));
      else sessionStorage.removeItem('currentResultId');
    } catch {
      // sessionStorage unavailable (SSR/private mode) — silently ignore
    }
  };

  const {
    phaseDefs, currentPhase, totalPhases,
    phaseStatus, phaseStatuses, results,
    isActive, allPhasesDone,
    submit, regenerate, nextPhase, prevPhase,
    goToPhase, reset, simulated,
  } = useMultiPhaseGeneration('slides');

  const currentDef = phaseDefs[currentPhase];
  const currentResult = currentDef ? results[currentDef.id] : null;
  const canGoNext = phaseStatus === 'done';
  const isFirst = currentPhase === 0;
  const isLast = currentPhase >= totalPhases - 1;

  const updateParam = (name: string, value: unknown) => {
    setMotorParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    await submit(motorParams);
  };

  const handleRegenerate = async () => {
    await regenerate(motorParams);
  };

  const mergedData = useMemo(() => {
    if (!allPhasesDone) return null;
    return mergePhaseResults('slides', results, motorParams) as unknown as Record<string, unknown>;
  }, [allPhasesDone, results, motorParams]);

  const handleClearEditor = useCallback(() => {
    setShowEditor(false);
    updateResultId(null);
    reset();
  }, [reset]);

  const handleSave = useCallback(async (resultId: number, data: Record<string, unknown>) => {
    const jsonData = JSON.stringify(data);
    if (resultId && currentResultId) {
      await updateMotorResult(resultId, jsonData);
    } else {
      const created = await createMotorResult({
        motor_type: 'slides',
        result_json: jsonData,
        simulated,
      });
      updateResultId(created.id);
    }
  }, [currentResultId, simulated]);

  const renderField = (field: PhaseField) => {
    const value = motorParams[field.name] ?? field.default ?? '';

    if (field.type === 'select') {
      return (
        <select
          value={value as string}
          onChange={(e) => updateParam(field.name, e.target.value)}
          disabled={isActive}
          className={styles.fieldInput}
          aria-label={field.label}
        >
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div className={styles.checkboxField}>
          <input
            type="checkbox"
            id={`field-${field.name}`}
            checked={value === true || value === 'true'}
            onChange={(e) => updateParam(field.name, e.target.checked)}
            disabled={isActive}
            className={styles.checkboxInput}
            aria-label={field.label}
          />
          <label htmlFor={`field-${field.name}`} className={styles.checkboxLabel}>
            {field.label}
          </label>
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value as string}
          onChange={(e) => updateParam(field.name, e.target.value)}
          disabled={isActive}
          placeholder={field.placeholder}
          className={`${styles.fieldInput} ${styles.textareaInput}`}
          aria-label={field.label}
        />
      );
    }

    return (
      <input
        type="text"
        value={value as string}
        onChange={(e) => updateParam(field.name, e.target.value)}
        disabled={isActive}
        placeholder={field.placeholder}
        className={styles.fieldInput}
        aria-label={field.label}
      />
    );
  };

  return (
    <div>
      <Header
        title="🖼️ Generar Diapositivas"
        subtitle="Genera diapositivas en 3 fases: esquema → desarrollo → actividades"
      />

      {/* Phase Stepper */}
      <PhaseStepper
        phases={phaseDefs}
        currentPhase={currentPhase}
        phaseStatuses={phaseStatuses}
        allPhasesDone={allPhasesDone}
        onPhaseClick={(i) => { if (phaseStatuses[i] === 'done') goToPhase(i); }}
      />

      {/* Phase header */}
      <div className={styles.phaseHeader}>
        <div className={styles.phaseMeta}>
          <div>
            <div className={styles.phaseSubtitle}>
              {currentDef?.subtitle}
            </div>
            <h3 className={styles.phaseTitle}>
              {currentDef?.label}
            </h3>
            <p className={styles.phaseDescription}>
              {currentDef?.description}
            </p>
          </div>
          {phaseStatus === 'done' && (
            <span className={styles.doneBadge}>
              ✅ Completado
            </span>
          )}
        </div>

        {/* Phase body: fields or result */}
        <div className={styles.phaseBody}>
          {phaseStatus === 'done' ? (
            currentResult ? (
              <ResultPreview data={currentResult} />
            ) : null
          ) : currentDef ? (
            <>
              {currentDef.fields.map(field => (
                <div key={field.name} className={styles.fieldGroup}>
                  {field.type !== 'checkbox' && (
                    <label className={styles.fieldLabel}>{field.label}</label>
                  )}
                  <div className={field.type !== 'checkbox' ? styles.fieldMargin : ''}>
                    {renderField(field)}
                  </div>
                </div>
              ))}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isActive}
                className={styles.submitBtn}
                aria-busy={isActive}
              >
                {isActive ? '⏳ Generando...' : `⚡ Generar ${currentDef.label}`}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Phase Navigation */}
      <PhaseNavigation
        currentPhase={currentPhase}
        totalPhases={totalPhases}
        phaseStatus={phaseStatus}
        isFirst={isFirst}
        isLast={isLast}
        canGoNext={canGoNext}
        isActive={isActive}
        onPrev={prevPhase}
        onNext={nextPhase}
        onRegenerate={handleRegenerate}
        onReset={reset}
      />

      {/* All phases done — visual editor */}
      {allPhasesDone && mergedData && (
        <div className={styles.editorComplete}>
          {!showEditor ? (
            <div className={styles.successCard}>
              <div className={styles.successHeader}>
                <div>
                  <div className={styles.successTitle}>🎉 ¡Documento completo!</div>
                  <div className={styles.successText}>
                    {phaseDefs.length} fases generadas correctamente. Visualiza y edita antes de descargar.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditor(true)}
                  className={styles.openEditorBtn}
                >
                  🎬 Abrir Editor Visual
                </button>
              </div>
            </div>
          ) : (
            <SlideEditorPanel
              mergedData={mergedData as MergedData}
              typeLabel={(motorParams.tema as string) || (motorParams.materia as string) || 'Diapositivas'}
              motorType="slides"
              resultId={currentResultId}
              onSave={handleSave}
              onClear={handleClearEditor}
            />
          )}
        </div>
      )}

      {/* Initial idle helper */}
      {phaseStatus === 'idle' && phaseStatuses.every(s => s === 'idle') && (
        <div className={styles.idleHelper}>
          <strong className={styles.helperTitle}>💡 ¿Cómo funciona la generación en fases?</strong><br />
          1. <strong>Esquema</strong> — Define la estructura: título, objetivos Bloom y conceptos clave<br />
          2. <strong>Desarrollo</strong> — Expande cada concepto con explicaciones y ejemplos<br />
          3. <strong>Actividades</strong> — Añade ejercicios prácticos y 📝 para copiar<br /><br />
          Cada fase se genera por separado para mayor calidad. Puedes regenerar una fase sin perder las demás.
        </div>
      )}
    </div>
  );
}
