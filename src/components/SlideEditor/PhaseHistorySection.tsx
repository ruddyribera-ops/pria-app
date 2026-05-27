import type { PhaseDef } from '../../lib/pptx/phaseDefinitions';
import ResultPreview from './ResultPreview';

interface PhaseHistorySectionProps {
  phaseDefs: PhaseDef[];
  currentPhase: number;
  results: Record<string, unknown>;
  title?: string;
}

const DEFAULT_TITLE = '📋 Ver contenido de fases anteriores';

export function PhaseHistorySection({
  phaseDefs,
  currentPhase,
  results,
  title = DEFAULT_TITLE,
}: PhaseHistorySectionProps): React.ReactNode {
  if (currentPhase <= 0) return null as React.ReactNode;

  return (
    <details style={{ marginBottom: '1rem', fontSize: '0.75rem' }}>
      <summary style={{ color: '#6b6b80', cursor: 'pointer', userSelect: 'none' }}>
        {title}
      </summary>
      <div style={{
        marginTop: '0.5rem', padding: '0.75rem', background: '#f8f8ff',
        borderRadius: '4px', maxHeight: '300px', overflow: 'auto',
      }}>
        {phaseDefs.slice(0, currentPhase).filter(p => results[p.id]).map((p, i) => (
          <div key={p.id} style={{ marginBottom: i < currentPhase - 1 ? '0.75rem' : 0 }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.25rem' }}>
              {p.label}
            </div>
            <ResultPreview data={results[p.id]} />
          </div>
        ))}
      </div>
    </details>
  ) as React.ReactNode;
}
