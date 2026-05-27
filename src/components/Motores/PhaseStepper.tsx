import type { PhaseDef } from '../../lib/pptx/phaseDefinitions';
import type { PhaseStatus } from '../../hooks/useMultiPhaseGeneration';

interface PhaseStepperProps {
  phases: PhaseDef[];
  currentPhase: number;
  phaseStatuses: PhaseStatus[];
  allPhasesDone: boolean;
  onPhaseClick?: (index: number) => void;
}

export default function PhaseStepper({ phases, currentPhase, phaseStatuses, allPhasesDone, onPhaseClick }: PhaseStepperProps) {
  if (phases.length === 0) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0, marginBottom: '1.25rem',
      background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px',
      padding: '0.75rem 1rem',
    }}>
      {phases.map((phase, i) => {
        const isActive = i === currentPhase;
        const isDone = phaseStatuses[i] === 'done' || allPhasesDone;
        const isPast = i < currentPhase;
        const isClickable = isPast || isDone;

        const statusIcon = isDone ? '✅' : isActive ? '⏳' : '○';
        const bgColor = isDone ? '#f0fdf4' : isActive ? '#eff6ff' : 'transparent';
        const textColor = isDone ? '#166534' : isActive ? '#1e40af' : '#6b6b80';
        const borderColor = isDone ? '#3A9E5E' : isActive ? '#5c6ac4' : '#e6e6eb';

        return (
          <div key={phase.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {/* Phase circle + label */}
            <div
              onClick={isClickable && onPhaseClick ? () => onPhaseClick(i) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isClickable ? 'pointer' : 'default',
                padding: '0.375rem 0.75rem', borderRadius: '6px', background: bgColor,
                border: `1px solid ${borderColor}`, transition: 'all 0.2s',
                opacity: isPast && !isActive ? 0.7 : 1,
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>{statusIcon}</span>
              <div>
                <div style={{
                  fontSize: '0.6875rem', fontWeight: 600, color: textColor,
                  textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap',
                }}>
                  {phase.label}
                </div>
                <div style={{
                  fontSize: '0.625rem', color: isDone ? '#22c55e' : '#6b6b80',
                  whiteSpace: 'nowrap',
                }}>
                  {isDone ? 'Completado' : isActive ? 'En progreso' : `Paso ${i + 1} de ${phases.length}`}
                </div>
              </div>
            </div>

            {/* Connector line between steps */}
            {i < phases.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 0.5rem',
                background: isDone ? '#3A9E5E' : '#e6e6eb',
                borderRadius: '1px', transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
