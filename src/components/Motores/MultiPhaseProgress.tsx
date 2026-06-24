import type { PhaseType } from '../../hooks/useMultiPhaseGeneration';
import styles from './MultiPhaseProgress.module.css';

interface MultiPhaseProgressProps {
  currentPhaseName: PhaseType | null;
  phaseProgress: number;
  completedPhases: PhaseType[];
  error: string | null;
  onCancel: () => void;
}

const PHASE_LABELS: Record<PhaseType, string> = {
  alpha2: 'Alpha-2',
  synthesis: 'Síntesis',
  abp: 'ABP',
  assessment: 'Evaluación',
};

const PHASE_ORDER: PhaseType[] = ['alpha2', 'synthesis', 'abp', 'assessment'];

export default function MultiPhaseProgress({
  currentPhaseName,
  phaseProgress,
  completedPhases,
  error,
  onCancel,
}: MultiPhaseProgressProps) {
  if (!currentPhaseName && completedPhases.length === 0 && !error) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Header row */}
      <div className={styles.headerRow}>
        <div className={styles.headerLabel}>
          {error ? '❌ Error' : currentPhaseName ? `⚡ ${PHASE_LABELS[currentPhaseName]}` : '✅ Completado'}
        </div>
        {currentPhaseName && !error && (
          <button
            onClick={onCancel}
            className={styles.cancelBtn}
            aria-label="Cancelar generación en curso"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {/* Progress bar for active phase */}
      {currentPhaseName && !error && (
        <div className={styles.progressSection}>
          <div className={styles.progressLabels}>
            <span>Progreso de fase</span>
            <span>{phaseProgress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${phaseProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Phase list */}
      <div className={styles.phaseList}>
        {PHASE_ORDER.map(phase => {
          const isActive = phase === currentPhaseName;
          const isDone = completedPhases.includes(phase);

          const pillClass = isDone
            ? styles.phasePillDone
            : isActive
              ? styles.phasePillActive
              : styles.phasePillIdle;

          return (
            <div
              key={phase}
              className={`${styles.phasePill} ${pillClass}`}
            >
              <span>{isDone ? '✅' : isActive ? '⏳' : '○'}</span>
              <span>{PHASE_LABELS[phase]}</span>
              {isActive && `(${phaseProgress}%)`}
            </div>
          );
        })}
      </div>
    </div>
  );
}
