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
import styles from './TrimestralPage.module.css';

const TAB_MOTOR_MAP: Record<string, MotorType> = {
  'plan-unidad': 'synthesis',
  pdc: 'pdc',
};

const TAB_LABELS: Record<string, string> = {
  'plan-unidad': '📋 Plan de Unidad y ABP',
  pdc: '📄 PDC Trimestral',
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
        className={styles.fieldSelect}
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
          id={`tri-field-${field.name}`}
          checked={val === true || val === 'true'}
          onChange={(e) => onChange(field.name, e.target.checked)}
          disabled={disabled}
          className={styles.checkboxInput}
          aria-label={field.label}
        />
        <label htmlFor={`tri-field-${field.name}`} className={styles.checkboxLabel}>
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
        className={`${styles.fieldSelect} ${styles.fieldTextarea}`}
        aria-label={field.label}
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
      className={styles.fieldSelect}
      aria-label={field.label}
    />
  );
}

function PhaseContextViewer({ mpg }: { mpg: ReturnType<typeof useMultiPhaseGeneration> }) {
  const hasResults = mpg.results && Object.keys(mpg.results).length > 0;
  if (!(mpg.currentPhase > 0 && hasResults)) return null;
  return (
    <details className={styles.phaseContext}>
      <summary className={styles.contextSummary}>
        📋 Ver contenido de fases anteriores
      </summary>
      <div className={styles.contextDetails}>
        {mpg.phaseDefs.slice(0, mpg.currentPhase).filter(p => mpg.results[p.id]).map((p) => (
          <div key={p.id} className={styles.contextPhase}>
            <div className={styles.contextPhaseLabel}>{p.label}</div>
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

  const handleSubmit = async () => { await mpg.submit(motorParams); };
  const handleRegenerate = async () => { await mpg.regenerate(motorParams); };
  const handleClearEditor = useCallback(() => { setShowEditor(false); }, []);

  const handleReset = () => {
    mpg.reset();
    setShowEditor(false);
  };

  const mergedData = useMemo(() => {
    if (!mpg.allPhasesDone) return null;
    return mergePhaseResults(motorType, mpg.results, motorParams) as unknown as Record<string, unknown>;
  }, [mpg.allPhasesDone, mpg.results, motorType, motorParams]);

  const currentPhaseDef = mpg.phaseDefs[mpg.currentPhase];
  const isGenerating = mpg.isActive;
  const isDone = mpg.phaseStatus === 'done';

  return (
    <div>
      <Header title="📆 Planificación Trimestral" subtitle="Plan de Unidad y PDC para el trimestre" />

      {/* Tabs */}
      <div className={styles.tabBar}>
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
            className={`${styles.tabBtn} ${activeTab === tabId ? styles.tabBtnActive : ''}`}
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
      <div className={styles.contentCard}>
        {currentPhaseDef && (
          <div className={styles.phaseHeader}>
            <div>
              {mpg.phaseStatuses[mpg.currentPhase] !== 'idle' && (
                <div className={styles.phaseSubtitle}>{currentPhaseDef.subtitle}</div>
              )}
              <h3 className={styles.phaseTitle}>{currentPhaseDef.label}</h3>
              <p className={styles.phaseDesc}>{currentPhaseDef.description}</p>
            </div>
            {mpg.phaseStatuses[mpg.currentPhase] === 'done' && (
              <span className={styles.doneBadge}>✅ Completado</span>
            )}
          </div>
        )}

        <PhaseContextViewer mpg={mpg} />

        {!isDone && currentPhaseDef && (
          <div className={styles.fieldList}>
            {currentPhaseDef.fields.map(field => (
              <div key={field.name} className={styles.fieldGroup}>
                {field.type !== 'checkbox' && (
                  <label className={styles.fieldLabel}>{field.label}</label>
                )}
                <div className={field.type !== 'checkbox' ? styles.fieldMargin : ''}>
                  {renderField(field, motorParams[field.name], updateParam, isGenerating)}
                </div>
              </div>
            ))}
            <button
              onClick={handleSubmit}
              disabled={isGenerating}
              className={styles.submitBtn}
              aria-busy={isGenerating}
            >
              {isGenerating ? '⏳ Generando...' : `⚡ Generar ${currentPhaseDef.label}`}
            </button>
          </div>
        )}

        {isDone && mpg.currentResult && (
          <div className={styles.phaseResult}>
            <div className={styles.resultTitle}>✅ {currentPhaseDef?.label} generado</div>
            <ResultPreview data={mpg.currentResult as Record<string, unknown>} />
          </div>
        )}

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
          <div className={styles.initialState}>
            {curriculumFromMaterials ? (
              <>
                <div className={styles.initialIcon}>📋</div>
                <p className={styles.initialTitle}>Contenido cargado desde Materiales</p>
                <p className={styles.initialSubtitle}>
                  {curriculumFromMaterials.unidad_real} — {curriculumFromMaterials.temas.length} tema(s) detectado(s)
                </p>
                <div className={styles.temasTags}>
                  {curriculumFromMaterials.temas.map((t: string, i: number) => (
                    <span key={i} className={styles.temaTag}>{t}</span>
                  ))}
                </div>
                <p className={styles.initialDesc}>
                  Este contenido fue extraído automáticamente de tu libro de texto. Los campos del formulario ya tienen contexto — completa los detalles y genera.
                </p>
                <a href="/materiales" className={styles.actionLink}>Ver en Materiales</a>
              </>
            ) : (
              <>
                <div className={styles.initialIcon}>📭</div>
                <p className={styles.initialDescCentered}>
                  No hay planificación para este período. Ve a Materiales y genera contenido con los motores IA.
                </p>
                <a href="/materiales" className={styles.actionLink}>Ir a Materiales</a>
              </>
            )}
          </div>
        )}
      </div>

      {/* All phases done — editor */}
      {mpg.allPhasesDone && mergedData && (
        <div className={styles.editorSection}>
          {!showEditor ? (
            <div className={styles.completeCard}>
              <div>
                <div className={styles.completeTitle}>🎉 ¡Documento completo!</div>
                <div className={styles.completeSubtitle}>
                  {mpg.totalPhases} fases generadas correctamente. Visualiza y edita antes de descargar.
                </div>
              </div>
              <button onClick={() => setShowEditor(true)} className={styles.openEditorBtn}>
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