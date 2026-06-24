import type { AssessmentOutput } from '../../types/motor-types';

interface Props {
  result: AssessmentOutput | null;
}

export default function MotorSection_Assessment({ result }: Props) {
  if (!result) return null;
  const e = result.evaluacion;
  if (!e) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.75rem' }}>
        📊 Rúbrica y Evaluación
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b6b80', marginBottom: '0.5rem' }}>
        Proyecto: <strong style={{ color: '#9333EA' }}>{e.proyecto}</strong>
      </div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        Criterios ({(e.rubrica?.criterios || []).length}):
      </div>
      {(e.rubrica?.criterios || []).map((c, idx) => (
        <div key={c.nombre ?? `criterio-${idx}`} style={{ marginBottom: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid #9333EA', fontSize: '0.6875rem' }}>
          <div style={{ fontWeight: 600 }}>{c.nombre} ({c.peso})</div>
          <div style={{ color: '#4a4a5a' }}>Excelente: {c.niveles?.excelente?.slice(0, 100)}</div>
        </div>
      ))}
      <div style={{ fontSize: '0.6875rem', color: '#6b6b80', marginTop: '0.5rem' }}>
        <strong>Autoevaluación:</strong> {(e.autoevaluacion?.preguntas || []).length} preguntas + reflexión
      </div>
    </div>
  );
}
