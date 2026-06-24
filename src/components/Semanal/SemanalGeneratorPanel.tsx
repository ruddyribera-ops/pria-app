import type { MotorType } from '../../types';
import type { MultiPhaseReturn } from '../../hooks/useMultiPhaseGeneration';
import PhaseFieldRenderer from '../Motores/PhaseFieldRenderer';
import PhaseStepper from '../Motores/PhaseStepper';
import PhaseNavigation from '../Motores/PhaseNavigation';
import MultiPhaseProgress from '../Motores/MultiPhaseProgress';
import ResultPreview from '../SlideEditor/ResultPreview';
import SlideEditorPanel, { type MergedData } from '../SlideEditor/SlideEditorPanel';
import styles from '../../styles/SemanalCommon.module.css';

const MOTOR_LABELS: Record<MotorType, string> = {
  plan: 'Plan de Clase',
  slides: 'Diapositivas',
  ficha: 'Ficha Gamificada',
  quiz: 'Pop Quiz',
  synthesis: 'Síntesis',
  pdc: 'PDC',
  alpha2: '',
  abp: '',
  assessment: '',
  tutor: '',
  recalibrate: '',
  micro: '',
};

interface Props {
  activeMotorType: MotorType | null;
  activeDay: string;
  activeLabel: string;
  params: Record<string, unknown>;
  showEditor: boolean;
  currentResultId: number | null;
  mergedData: MergedData | null;
  currentPhaseDef: PhaseDef | undefined;
  mpg: MultiPhaseReturn;
  onReset: () => void;
  onRunMultiPhase: () => void;
  onRegenerate: () => void;
  onClearEditor: () => void;
  onSave: (resultId: number, data: Record<string, unknown>) => void;
  onParamsChange: (name: string, val: unknown) => void;
}

// Import PhaseDef type
import type { PhaseDef } from '../../lib/pptx/phaseDefinitions';

export default function SemanalGeneratorPanel({
  activeMotorType, activeDay, activeLabel, params, showEditor,
  currentResultId, mergedData, currentPhaseDef, mpg,
  onReset, onRunMultiPhase, onRegenerate, onClearEditor, onSave, onParamsChange,
}: Props) {
  const handleSave = async (resultId: number, data: Record<string, unknown>) => {
    await onSave(resultId, data);
  };

  return (
    <div className={styles.genPanel}>
      <div className={styles.genPanelHeader}>
        <div>
          <div className={styles.genPanelMeta}>Generación activa · {activeLabel}</div>
          <div className={styles.genPanelTitle}>{MOTOR_LABELS[activeMotorType!]} en {mpg.totalPhases} fases</div>
        </div>
        <button onClick={onReset} className={styles.cancelBtn} type="button" aria-label="Cancelar generación">
          ✕ Cancelar
        </button>
      </div>

      <MultiPhaseProgress
        currentPhaseName={mpg.currentPhaseName}
        phaseProgress={mpg.phaseProgress}
        completedPhases={mpg.completedPhases}
        error={mpg.error}
        onCancel={mpg.cancel}
      />

      <PhaseStepper
        phases={mpg.phaseDefs}
        currentPhase={mpg.currentPhase}
        phaseStatuses={mpg.phaseStatuses}
        allPhasesDone={mpg.allPhasesDone}
        onPhaseClick={(i) => { if (mpg.isPhaseDone(i)) mpg.goToPhase(i); }}
      />

      {mpg.phaseStatuses[mpg.currentPhase] !== 'done' && currentPhaseDef && (
        <div>
          <div className={styles.phaseMetaInfo}>{currentPhaseDef.subtitle}</div>
          <h4 className={styles.phaseTitle}>{currentPhaseDef.label}</h4>
          <p className={styles.phaseDesc}>{currentPhaseDef.description}</p>

          <div className={styles.fieldList}>
            {currentPhaseDef.fields.map(field => (
              <div key={field.name} className={styles.fieldItem}>
                {field.type !== 'checkbox' && (
                  <span className={styles.filterLabel}>{field.label}</span>
                )}
                <div className={field.type !== 'checkbox' ? styles.fieldMarginTop : ''}>
                  <PhaseFieldRenderer
                    field={field}
                    value={params[field.name]}
                    onChange={onParamsChange}
                    disabled={mpg.isActive}
                    textClass={styles.filterInput}
                    selectClass={styles.filterSelect}
                    textareaClass={styles.textareaInput}
                    checkboxFieldClass={styles.checkboxField}
                    checkboxInputClass={styles.checkboxInput}
                    checkboxLabelClass={styles.checkboxLabel}
                  />
                </div>
              </div>
            ))}
          </div>

          {!mpg.currentPhaseName && !mpg.allPhasesDone && (
            <button
              onClick={onRunMultiPhase}
              disabled={mpg.isActive}
              className={styles.genSubmitBtn}
              type="button"
              aria-busy={mpg.isActive}
            >
              {mpg.isActive ? '⏳ Generando...' : `⚡ Generar Todo (${mpg.totalPhases} fases)`}
            </button>
          )}

          {mpg.currentPhaseName && (
            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#6b6b80', fontSize: '0.875rem' }}>
              Ejecutando fase {mpg.completedPhases.length + 1} de {mpg.totalPhases}...
            </div>
          )}
        </div>
      )}

      {mpg.phaseStatuses[mpg.currentPhase] === 'done' && mpg.currentResult !== null && (
        <div className={styles.phaseResult}>
          <div className={styles.phaseResultTitle}>✅ {currentPhaseDef?.label} completado</div>
          <ResultPreview data={mpg.currentResult} />
        </div>
      )}

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
        onRegenerate={onRegenerate}
        onReset={onReset}
      />

      {mpg.allPhasesDone && mergedData && (
        <div>
          {!showEditor ? (
            <div className={styles.completeCard}>
              <div>
                <div className={styles.completeTitle}>🎉 {MOTOR_LABELS[activeMotorType!]} completo</div>
                <div className={styles.completeSubtitle}>{mpg.totalPhases} fases generadas para {activeLabel}</div>
              </div>
              <button onClick={() => {}} className={styles.openEditorBtn} type="button">
                🎬 Abrir Editor Visual
              </button>
            </div>
          ) : (
            <SlideEditorPanel
              mergedData={mergedData}
              typeLabel={MOTOR_LABELS[activeMotorType!]}
              motorType={activeMotorType! as 'slides' | 'plan' | 'ficha' | 'quiz' | 'pdc' | 'synthesis'}
              filenameExtra={activeDay}
              resultId={currentResultId}
              onSave={handleSave}
              onClear={onClearEditor}
            />
          )}
        </div>
      )}
    </div>
  );
}