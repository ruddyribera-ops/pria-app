import { useState, useEffect } from 'react';
import styles from './MotorButton.module.css';

interface MotorButtonProps {
  label: string;
  loadingLabel: string;
  color: string;
  onClick: () => void;
  loading: boolean;
  subtitle?: string;
  disabled?: boolean;
  progressPhases?: string[];
  success?: boolean;
}

/**
 * Polished v2 MotorButton — replaces generic "Generar" buttons with:
 * - Phased progress messages during loading
 * - Smooth hover/active transitions
 * - Success state with checkmark
 * - Personality through micro-copy
 */
export default function MotorButton({
  label,
  loadingLabel,
  color,
  onClick,
  loading,
  subtitle,
  disabled,
  progressPhases = [],
  success = false,
}: MotorButtonProps) {
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    if (!loading || progressPhases.length === 0) {
      setPhaseIdx(0);
      return;
    }
    setPhaseIdx(0);
    const interval = setInterval(() => {
      setPhaseIdx(prev => (prev + 1) % progressPhases.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [loading, progressPhases]);

  const currentPhase = progressPhases[phaseIdx] || loadingLabel;
  const showProgress = loading && progressPhases.length > 0;
  const showSuccess = success && !loading;
  const progressPercent = showProgress
    ? Math.round(((phaseIdx + 1) / progressPhases.length) * 100)
    : 0;

  const buttonElement = (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      aria-busy={loading}
      aria-label={loading ? currentPhase : label}
      aria-disabled={disabled}
      className={[
        styles.btn,
        loading ? styles.btnLoading : '',
        disabled ? styles.btnDisabled : '',
      ].filter(Boolean).join(' ')}
      style={{ '--btn-color': disabled ? '#9CA3AF' : color } as React.CSSProperties}
    >
      {showSuccess && (
        <span className={styles.successIcon} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
      {loading && !showSuccess && (
        <span className={styles.spinner} aria-hidden="true" />
      )}
      <span className={styles.btnText}>
        <span>{showSuccess ? '¡Listo!' : loading ? currentPhase : label}</span>
        {showProgress && (
          <span className={styles.btnSubtext}>{progressPercent}% · {currentPhase.split(' ')[0]}</span>
        )}
      </span>
      {showProgress && (
        <span className={styles.progressBar} aria-hidden="true">
          <span className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </span>
      )}
    </button>
  );

  if (subtitle) {
    return (
      <div className={styles.withSubtitle}>
        <div className={styles.subtitle}>{subtitle}</div>
        {buttonElement}
      </div>
    );
  }

  return buttonElement;
}
