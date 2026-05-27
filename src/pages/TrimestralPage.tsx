import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Layout/Header';
import { useMultiPhaseGeneration } from '../hooks/useMultiPhaseGeneration';
import { useCurriculum } from '../hooks/useCurriculum';
import type { MotorType } from '../hooks/useMotorGeneration';
import PhaseStepper from '../components/Motores/PhaseStepper';
import PhaseNavigation from '../components/Motores/PhaseNavigation';
import SlideEditorPanel from '../components/SlideEditor/SlideEditorPanel';
import ResultPreview from '../components/SlideEditor/ResultPreview';
import { mergePhaseResults } from '../lib/pptx/multiPhaseContent';
import type { PhaseField } from '../lib/pptx/phaseDefinitions';

const TAB_MOTOR_MAP: Record<string, MotorType> = {
  'plan-unidad': 'synthesis',
  pdc: 'pdc',
};

const TAB_LABELS: Record<string, string> = {
  'plan-unidad': '📋 Plan de Unidad y ABP',
  pdc: '📄 PDC Trimestral',
};

const LABEL_STYLE = {
  fontSize: '0.6875rem', fontWeight: 600 as const, color: '#6b6b80',
  textTransform: 'uppercase' as const, letterSpacing: '0.04em',
};

function renderField(
  field: PhaseField,
  value: unknown,
  onChange: (name: string, val: unknown) => void,
  disabled: boolean,
) {
  const val = (value !== undefined && value !== '') ? value : field.default ?? '';

  if (field.type === 'select') {
    return (
      <select
        value={val as string}
        onChange={(e) => onChange(field.name, e.target.value)}
        disabled={disabled}
        style={{
          width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0',
          borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff',
          boxSizing: 'border-box',
        }}
      >
        {(field.options || []).map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          id={`field-${field.name}`}
          checked={val === true || val === 'true'}
          onChange={(e) => onChange(field.name, e.target.checked)}
          disabled={disabled}
          style={{ width: '18px', height: '18px', accentColor: '#3A9E5E', borderRadius: '3px' }}
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
        value={val as string}
        onChange={(e) => onChange(field.name, e.target.value)}
        disabled={disabled}
        placeholder={field.placeholder}
        style={{
          width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0',
          borderRadius: '4px', fontSize: '0.8125rem', outline: 'none',
          background: '#f8f8ff', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box',
        }}
      />
    );
  }

  return (
    <input
      type="text"
      value={val as string}
      onChange={(e) => onChange(field.name, e.target.value)}
      disabled={disabled}
      placeholder={field.placeholder}
      style={{
        width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0',
        borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff',
        boxSizing: 'border-box',
      }}
    />
  );
}

function PhaseContextViewer({ mpg }: { mpg: ReturnType<typeof useMultiPhaseGeneration> }) {
  const hasResults = mpg.results && Object.keys(mpg.results).length > 0;
  if (!(mpg.currentPhase > 0 && hasResults)) return null;
  return (
    <details style={{ marginBottom: '1rem', fontSize: '0.75rem' }}>
      <summary style={{ color: '#6b6b80', cursor: 'pointer', userSelect: 'none' }}>
        📋 Ver contenido de fases anteriores
      </summary>
      <div style={{
        marginTop: '0.5rem', padding: '0.75rem', background: '#f8f8ff',
        borderRadius: '4px', maxHeight: '300px', overflow: 'auto',
      }}>
        {mpg.phaseDefs.slice(0, mpg.currentPhase).filter(p => mpg.results[p.id]).map((p) => (
          <div key={p.id} style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.25rem' }}>
              {p.label}
            </div>
            <ResultPreview data={(mpg.results[p.id] as Record<string, unknown>) || {}} />
          </div>
        ))}
      </div>
    </details>
  );
}

export default function TrimestralPage() {
  const [activeTab, setActiveTab] = useState('plan-unidad');
  const [motorParams, setMotorParams] = useState<Record<string, unknown>>({});
  const [showEditor, setShowEditor] = useState(false);

  const { curriculum: curriculumFromMaterials, loading: _curriculumLoading } = useCurriculum();

  const motorType = TAB_MOTOR_MAP[activeTab] || 'synthesis';
  const mpg = useMultiPhaseGeneration(motorType);

  useEffect(() => {
    setMotorParams({});
  }, [activeTab]);

  const updateParam = (name: string, value: unknown) => {
    setMotorParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    await mpg.submit(motorParams);
  };

  const handleRegenerate = async () => {
    await mpg.regenerate(motorParams);
  };

  const mergedData = useMemo(() => {
    if (!mpg.allPhasesDone) return null;
    return mergePhaseResults(motorType, mpg.results, motorParams) as unknown as Record<string, unknown>;
  }, [mpg.allPhasesDone, mpg.results, motorType, motorParams]);

  const handleClearEditor = useCallback(() => {
    setShowEditor(false);
  }, []);

  const handleReset = () => {
    mpg.reset();
    setShowEditor(false);
  };

  const currentPhaseDef = mpg.phaseDefs[mpg.currentPhase];
  const isGenerating = mpg.isActive;
  const isDone = mpg.phaseStatus === 'done';

  return (
    <div>
      <Header title="📆 Planificación Trimestral" subtitle="Plan de Unidad y PDC para el trimestre" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: '2px solid #e6e6eb' }}>
        {Object.entries(TAB_MOTOR_MAP).map(([tabId, _motorType]) => (
          <button
            key={tabId}
            onClick={() => {
              if (!mpg.isActive) {
                mpg.reset();
                setActiveTab(tabId);
              }
            }}
            disabled={mpg.isActive}
            style={{
              padding: '0.625rem 1.25rem', fontSize: '0.8125rem',
              fontWeight: activeTab === tabId ? 600 : 500,
              color: activeTab === tabId ? '#3A9E5E' : '#6b6b80',
              border: 'none', background: 'none',
              borderBottom: activeTab === tabId ? '2px solid #3A9E5E' : '2px solid transparent',
              marginBottom: '-2px', cursor: mpg.isActive ? 'not-allowed' : 'pointer',
              opacity: mpg.isActive ? 0.5 : 1,
            }}
          >
            {TAB_LABELS[tabId]}
          </button>
        ))}
      </div>

      {/* Phase Stepper */}
      {mpg.phaseStatuses.some(s => s !== 'idle') && (
        <PhaseStepper
          phases={mpg.phaseDefs}
          currentPhase={mpg.currentPhase}
          phaseStatuses={mpg.phaseStatuses}
          allPhasesDone={mpg.allPhasesDone}
          onPhaseClick={(i) => { if (mpg.phaseStatuses[i] === 'done') mpg.goToPhase(i); }}
        />
      )}

      {/* Content Card */}
      <div style={{
        background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', padding: '1.25rem',
      }}>
        {/* Current phase header */}
        {currentPhaseDef && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            marginBottom: '1rem', paddingBottom: '0.75rem',
            borderBottom: '1px solid #e6e6eb',
          }}>
            <div>
              {mpg.phaseStatuses[mpg.currentPhase] !== 'idle' && (
                <div style={{ fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0.125rem' }}>
                  {currentPhaseDef.subtitle}
                </div>
              )}
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f', margin: 0 }}>
                {currentPhaseDef.label}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#6b6b80', margin: '0.25rem 0 0' }}>
                {currentPhaseDef.description}
              </p>
            </div>
            {mpg.phaseStatuses[mpg.currentPhase] === 'done' && (
              <span style={{
                background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.75rem',
                borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                ✅ Completado
              </span>
            )}
          </div>
        )}

        {/* Previous phase context */}
        {<PhaseContextViewer mpg={mpg} /> as any}

        {/* Phase form */}
        {!isDone && currentPhaseDef && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            {currentPhaseDef.fields.map(field => (
              <div key={field.name}>
                {field.type !== 'checkbox' && <label style={LABEL_STYLE}>{field.label}</label>}
                <div style={{ marginTop: field.type !== 'checkbox' ? '0.375rem' : 0 }}>
                  {renderField(field, motorParams[field.name], updateParam, isGenerating)}
                </div>
              </div>
            ))}
            <button
              onClick={handleSubmit}
              disabled={isGenerating}
              style={{
                padding: '0.6rem 1.5rem', background: isGenerating ? '#b3b3cc' : '#3A9E5E',
                color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600,
                fontSize: '0.875rem', cursor: isGenerating ? 'not-allowed' : 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              {isGenerating ? '⏳ Generando...' : `⚡ Generar ${currentPhaseDef.label}`}
            </button>
          </div>
        )}

        {/* Current phase result */}
        {isDone && mpg.currentResult && (
          <div style={{
            padding: '0.75rem', background: '#f0fdf4', borderRadius: '4px',
            border: '1px solid #bbf7d0',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: '0.375rem' }}>
              ✅ {currentPhaseDef?.label} generado
            </div>
            <ResultPreview data={mpg.currentResult as Record<string, unknown>} />
          </div>
        )}

        {/* Phase Navigation */}
        {mpg.phaseStatuses.some(s => s !== 'idle') && (
          <PhaseNavigation
            currentPhase={mpg.currentPhase}
            totalPhases={mpg.totalPhases}
            phaseStatus={mpg.phaseStatus}
            isFirst={mpg.currentPhase === 0}
            isLast={mpg.currentPhase >= mpg.totalPhases - 1}
            canGoNext={mpg.phaseStatus === 'done'}
            isActive={mpg.isActive}
            onPrev={mpg.prevPhase}
            onNext={mpg.nextPhase}
            onRegenerate={handleRegenerate}
            onReset={handleReset}
          />
        )}

        {/* Initial state */}
        {mpg.phaseStatuses.every(s => s === 'idle') && (
          <div style={{
            padding: '2rem', textAlign: 'center', background: '#fff',
            border: '1px solid #e6e6eb', borderRadius: '8px',
          }}>
            {curriculumFromMaterials ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
                  Contenido cargado desde Materiales
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0.75rem' }}>
                  {curriculumFromMaterials.unidad_real} — {curriculumFromMaterials.temas.length} tema(s) detectado(s)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', justifyContent: 'center', marginBottom: '1rem' }}>
                  {curriculumFromMaterials.temas.map((t: string, i: number) => (
                    <span key={i} style={{ background: '#e0f2fe', color: '#0891B2', borderRadius: '4px', padding: '0.25rem 0.625rem', fontSize: '0.6875rem', fontWeight: 500 }}>
                      {t}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6b6b80', margin: '0 auto 1rem', maxWidth: '400px' }}>
                  Este contenido fue extraído automáticamente de tu libro de texto. Los campos del formulario ya tienen contexto — completa los detalles y genera.
                </p>
                <a href="/materiales" style={{
                  display: 'inline-block', padding: '0.6rem 1.5rem', background: '#3A9E5E',
                  color: '#fff', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  Ver en Materiales
                </a>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p style={{ fontSize: '0.875rem', color: '#6b6b80', marginBottom: '1rem', maxWidth: '400px', margin: '0 auto 1rem' }}>
                  No hay planificación para este período. Ve a Materiales y genera contenido con los motores IA.
                </p>
                <a href="/materiales" style={{
                  display: 'inline-block', padding: '0.6rem 1.5rem', background: '#3A9E5E',
                  color: '#fff', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  Ir a Materiales
                </a>
              </>
            )}
          </div>
        )}
      </div>

      {/* All phases done — editor */}
      {mpg.allPhasesDone && mergedData && (
        <div style={{ marginTop: '1.25rem' }}>
          {!showEditor ? (
            <div style={{
              padding: '1.25rem', background: '#f0fdf4',
              border: '1px solid #bbf7d0', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#166534' }}>
                  🎉 ¡Documento completo!
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b6b80' }}>
                  {mpg.totalPhases} fases generadas correctamente. Visualiza y edita antes de descargar.
                </div>
              </div>
              <button onClick={() => setShowEditor(true)}
                style={{
                  padding: '0.6rem 1.25rem', background: '#3A9E5E',
                  color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600,
                  fontSize: '0.8125rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap',
                }}>
                🎬 Abrir Editor Visual
              </button>
            </div>
          ) : (
            <SlideEditorPanel
              mergedData={mergedData as any}
              typeLabel={motorType === 'pdc' ? 'PDC_Trimestral' : 'Plan_Unidad'}
              motorType={motorType as 'slides' | 'plan' | 'ficha' | 'quiz' | 'pdc' | 'synthesis'}
              onClear={handleClearEditor}
            />
          )}
        </div>
      )}
    </div>
  );
}