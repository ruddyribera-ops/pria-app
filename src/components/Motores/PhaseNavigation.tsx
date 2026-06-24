import type { PhaseStatus } from '../../hooks/useMultiPhaseGeneration';

interface PhaseNavigationProps {
  currentPhase: number;
  totalPhases: number;
  phaseStatus: PhaseStatus;
  isFirst: boolean;
  isLast: boolean;
  canGoNext: boolean;
  isActive: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRegenerate: () => void;
  onReset: () => void;
}

export default function PhaseNavigation({
  currentPhase: _currentPhase,
  totalPhases,
  phaseStatus,
  isFirst,
  isLast,
  canGoNext,
  isActive,
  onPrev,
  onNext,
  onRegenerate,
  onReset,
}: PhaseNavigationProps) {
  if (totalPhases <= 1) return null;

  const isDone = phaseStatus === 'done';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginTop: '1rem', padding: '0.75rem 0', borderTop: '1px solid #e6e6eb',
    }}>
      {/* Left: Prev + Regenerate */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {!isFirst && (
          <button
            type="button"
            onClick={onPrev}
            disabled={isActive}
            style={{
              padding: '0.5rem 1rem', border: '1px solid #e6e6eb', borderRadius: '4px',
              background: '#fff', fontSize: '0.8125rem', fontWeight: 500,
              color: isActive ? '#ccc' : '#6b6b80', cursor: isActive ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            ← Anterior
          </button>
        )}

        {isDone && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isActive}
            style={{
              padding: '0.5rem 1rem', border: '1px solid #e6e6eb', borderRadius: '4px',
              background: '#fffbeb', fontSize: '0.8125rem', fontWeight: 500,
              color: isActive ? '#ccc' : '#b45309', cursor: isActive ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            🔄 Regenerar
          </button>
        )}
      </div>

      {/* Right: Next or Finish */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {!isLast && (
          <button
            type="button"
            onClick={onNext}
            disabled={isActive || !canGoNext}
            style={{
              padding: '0.5rem 1.25rem', border: 'none', borderRadius: '4px',
              background: !isActive && canGoNext ? '#3A9E5E' : '#b3b3cc',
              fontSize: '0.8125rem', fontWeight: 600, color: '#fff',
              cursor: !isActive && canGoNext ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            Siguiente →
          </button>
        )}

        {isLast && isDone && (
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: '0.5rem 1.25rem', border: '1px solid #e6e6eb', borderRadius: '4px',
              background: '#fff', fontSize: '0.8125rem', fontWeight: 500, color: '#6b6b80',
              cursor: 'pointer',
            }}
          >
            ✕ Cerrar y empezar nuevo
          </button>
        )}
      </div>
    </div>
  );
}
