import { useState, useCallback, useMemo } from 'react';
import Header from '../components/Layout/Header';
import PhaseStepper from '../components/Motores/PhaseStepper';
import PhaseNavigation from '../components/Motores/PhaseNavigation';
import SlideEditorPanel from '../components/SlideEditor/SlideEditorPanel';
import ResultPreview from '../components/SlideEditor/ResultPreview';
import { useMultiPhaseGeneration } from '../hooks/useMultiPhaseGeneration';
import { mergePhaseResults } from '../lib/pptx/multiPhaseContent';
import type { PhaseField } from '../lib/pptx/phaseDefinitions';
import styles from './SlideGeneratorPage.module.css';

export default function SlideGeneratorPage() {
  const [motorParams, setMotorParams] = useState<Record<string, unknown>>({});
  const [showEditor, setShowEditor] = useState(false);

  const {
    phaseDefs, currentPhase, totalPhases,
    phaseStatus, phaseStatuses, results,
    isActive, allPhasesDone,
    submit, regenerate, nextPhase, prevPhase,
    goToPhase, reset,
  } = useMultiPhaseGeneration('slides');

  const currentDef = phaseDefs[currentPhase];
  const currentResult = currentDef ? results[currentDef.id] : null;
  const isDone = phaseStatus === 'done';
  const canGoNext = isDone;
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
    reset();
  }, [reset]);

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
          {isDone && (
            <span className={styles.doneBadge}>
              ✅ Completado
            </span>
          )}
        </div>

        {/* Phase body: fields or result */}
        <div className={styles.phaseBody}>
          {isDone ? (
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
                  onClick={() => setShowEditor(true)}
                  className={styles.openEditorBtn}
                >
                  🎬 Abrir Editor Visual
                </button>
              </div>
            </div>
          ) : (
            <SlideEditorPanel
              mergedData={mergedData as any}
              typeLabel={(motorParams.tema as string) || (motorParams.materia as string) || 'Diapositivas'}
              motorType="slides"
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