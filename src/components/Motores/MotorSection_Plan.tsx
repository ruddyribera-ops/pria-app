import type { PlanOutput } from '../../types/motor-types';

interface Props {
  result: PlanOutput | null;
}

export default function MotorSection_Plan({ result }: Props) {
  if (!result) return null;
  try {
    const sd = result.secuencia_didactica;
    if (!sd) return null;
    return (
      <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.75rem' }}>
          📋 Plan de Clase
        </div>
        {sd.bloques?.map((b, j) => (
          <div key={j} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#FFF7ED', borderRadius: '4px', fontSize: '0.75rem' }}>
            <div style={{ fontWeight: 600, color: '#D97706' }}>{b.nombre} — {b.duracion} min</div>
            <div style={{ color: '#4a4a5a' }}>{b.objetivo}</div>
            <div style={{ color: '#6b6b80', marginTop: '0.25rem' }}>{b.actividad?.slice(0, 200)}</div>
            {b.nota && <div style={{ color: '#9333EA', fontSize: '0.6875rem', marginTop: '0.25rem' }}>💡 {b.nota}</div>}
          </div>
        ))}
        <div style={{ fontSize: '0.6875rem', color: '#6b6b80' }}>
          Inteligencias: {result.inteligencias_multiples?.map((i) => i.inteligencia).join(', ')}
        </div>
      </div>
    );
  } catch { return null; }
}
