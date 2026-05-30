import styles from './MotorButton.module.css';

interface MotorButtonProps {
  label: string;
  loadingLabel: string;
  color: string;
  onClick: () => void;
  loading: boolean;
  subtitle?: string;
}

export default function MotorButton({
  label,
  loadingLabel,
  color,
  onClick,
  loading,
  subtitle,
}: MotorButtonProps) {
  const buttonElement = (
    <button
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      aria-label={loading ? loadingLabel : label}
      className={`${styles.btn} ${loading ? styles.btnLoading : ''}`}
      style={{ '--btn-color': color } as React.CSSProperties}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span>{loading ? loadingLabel : label}</span>
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
