interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="progress-section" style={{
      background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px',
      padding: '1rem 1.25rem', marginTop: '1.25rem',
    }}>
      <div className="progress-label" style={{
        display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem',
        fontWeight: 500, color: '#1e1e2f', marginBottom: '0.5rem',
      }}>
        <span>{label || '📊 Progreso del Período'}</span>
        <span>Día {current}/{total}</span>
      </div>
      <div className="progress-bar" style={{
        height: '6px', background: '#e6e6eb', borderRadius: '3px', overflow: 'hidden',
      }}>
        <div className="progress-bar-fill" style={{
          height: '100%', background: 'linear-gradient(90deg, #3A9E5E, #45b06b)',
          borderRadius: '3px', transition: 'width .5s', width: `${pct}%`,
        }} />
      </div>
    </div>
  );
}
