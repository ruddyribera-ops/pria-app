import React, { useState, useCallback, useMemo } from 'react';
import Header from '../components/Layout/Header';
import PhaseStepper from '../components/Motores/PhaseStepper';
import PhaseNavigation from '../components/Motores/PhaseNavigation';
import SlideEditorPanel from '../components/SlideEditor/SlideEditorPanel';
import ResultPreview from '../components/SlideEditor/ResultPreview';
import { useMultiPhaseGeneration } from '../hooks/useMultiPhaseGeneration';
import { mergePhaseResults } from '../lib/pptx/multiPhaseContent';
import type { PhaseField } from '../lib/pptx/phaseDefinitions';

const INPUT_STYLE: React.CSSProperties = {
  padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px',
  fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff', width: '100%',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

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
          style={INPUT_STYLE}
        >
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
          <input
            type="checkbox"
            id={`field-${field.name}`}
            checked={value === true || value === 'true'}
            onChange={(e) => updateParam(field.name, e.target.checked)}
            disabled={isActive}
            style={{ width: '18px', height: '18px', accentColor: '#3A9E5E', cursor: isActive ? 'not-allowed' : 'pointer' }}
          />
          <label htmlFor={`field-${field.name}`} style={{ fontSize: '0.8125rem', color: '#1e1e2f' }}>
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
          style={{ ...INPUT_STYLE, minHeight: '80px', resize: 'vertical' }}
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
        style={INPUT_STYLE}
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
      <div style={{
        background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px',
        padding: '1.5rem', marginBottom: '1rem',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1rem', paddingBottom: '0.75rem',
          borderBottom: '1px solid #e6e6eb',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0.125rem' }}>
              {currentDef?.subtitle}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f', margin: 0 }}>
              {currentDef?.label}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#6b6b80', margin: '0.25rem 0 0' }}>
              {currentDef?.description}
            </p>
          </div>
          {isDone && (
            <span style={{
              background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.75rem',
              borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              ✅ Completado
            </span>
          )}
        </div>

        {/* Phase body: fields or result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isDone ? (
            currentResult ? (
              <ResultPreview data={currentResult} />
            ) : null
          ) : currentDef ? (
            <>
              {currentDef.fields.map(field => (
                <div key={field.name}>
                  {field.type !== 'checkbox' && (
                    <label style={LABEL_STYLE}>{field.label}</label>
                  )}
                  <div style={{ marginTop: field.type !== 'checkbox' ? '0.375rem' : 0 }}>
                    {renderField(field)}
                  </div>
                </div>
              ))}
              <button
                onClick={handleSubmit}
                disabled={isActive}
                style={{
                  padding: '0.6rem 1.5rem', background: isActive ? '#b3b3cc' : '#3A9E5E',
                  color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600,
                  fontSize: '0.875rem', cursor: isActive ? 'not-allowed' : 'pointer',
                  alignSelf: 'flex-start',
                }}
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
        <div style={{ marginTop: '1.25rem' }}>
          {!showEditor ? (
            <div style={{
              border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem',
              background: '#f0fdf4',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#166534', marginBottom: '0.25rem' }}>
                    🎉 ¡Documento completo!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b6b80' }}>
                    {phaseDefs.length} fases generadas correctamente. Visualiza y edita antes de descargar.
                  </div>
                </div>
                <button
                  onClick={() => setShowEditor(true)}
                  style={{
                    padding: '0.6rem 1.25rem', background: '#3A9E5E',
                    color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600,
                    fontSize: '0.8125rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap',
                  }}
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
        <div style={{
          marginTop: '1.5rem', padding: '1rem', background: '#f8f8ff',
          border: '1px solid #e6e6eb', borderRadius: '8px',
          fontSize: '0.75rem', color: '#6b6b80',
        }}>
          <strong style={{ color: '#1e1e2f' }}>💡 ¿Cómo funciona la generación en fases?</strong><br />
          1. <strong>Esquema</strong> — Define la estructura: título, objetivos Bloom y conceptos clave<br />
          2. <strong>Desarrollo</strong> — Expande cada concepto con explicaciones y ejemplos<br />
          3. <strong>Actividades</strong> — Añade ejercicios prácticos y 📝 para copiar<br /><br />
          Cada fase se genera por separado para mayor calidad. Puedes regenerar una fase sin perder las demás.
        </div>
      )}
    </div>
  );
}