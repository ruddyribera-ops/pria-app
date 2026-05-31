import type { QuizOutput } from '../../types/motor-types';

interface Props {
  result: QuizOutput | null;
}

export default function MotorSection_Quiz({ result }: Props) {
  if (!result) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
        📝 Pop Quiz — {result.quiz?.preguntas?.length || 0} preguntas
      </div>
      {result.quiz?.preguntas?.map((q, j) => (
        <div key={j} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#f5f3ff', borderRadius: '4px', fontSize: '0.6875rem' }}>
          <div style={{ fontWeight: 600, color: '#7C3AED' }}>{q.numero}. [{q.tipo}] {q.pregunta?.slice(0, 120)}</div>
          {q.opciones && <div style={{ color: '#6b6b80' }}>{q.opciones.join(' | ')}</div>}
        </div>
      ))}
    </div>
  );
}
