import type { ABPOutput } from '../../types/motor-types';

interface Props {
  result: ABPOutput | null;
}

export default function MotorSection_ABP({ result }: Props) {
  if (!result) return null;
  try {
    const p = result.proyecto;
    if (!p) return null;
    return (
      <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.75rem' }}>
          🚀 Proyecto ABP
        </div>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2563EB', marginBottom: '0.25rem' }}>
          {p.titulo}
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#4a4a5a', marginBottom: '0.75rem', fontStyle: 'italic' }}>
          ❓ {p.pregunta_generadora}
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.25rem' }}>
          Fases ({(p.fases || []).length}):
        </div>
        {(p.fases || []).map((f, j) => (
          <div key={j} style={{ marginBottom: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid #2563EB', fontSize: '0.75rem' }}>
            <div style={{ fontWeight: 600 }}>{f.nombre} — {f.duracion}</div>
            {(f.actividades || []).map((a, k) => (
              <div key={k} style={{ color: '#4a4a5a' }}>• {a}</div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.5rem' }}>Productos:</div>
        {(p.productos || []).map((pr, j) => (
          <div key={j} style={{ fontSize: '0.75rem', color: '#4a4a5a' }}>📦 {pr}</div>
        ))}
        {p.evaluacion && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.6875rem', color: '#6b6b80' }}>
            <strong>Evaluación:</strong> {(p.evaluacion.instrumentos || []).join(', ')}
          </div>
        )}
      </div>
    );
  } catch { return null; }
}
