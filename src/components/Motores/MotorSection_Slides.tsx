import type { SlidesOutput } from '../../types/motor-types';

interface Props {
  result: SlidesOutput | null;
}

export default function MotorSection_Slides({ result }: Props) {
  if (!result) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
        🖼️ Diapositivas ({result.length || 0} slides)
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {result.map((s, j) => (
          <div key={j} style={{ marginBottom: '0.25rem', fontSize: '0.6875rem', padding: '0.25rem 0.5rem', background: j % 2 === 0 ? '#f0fdf4' : '#fff', borderRadius: '3px' }}>
            <span style={{ fontWeight: 600, color: '#059669' }}>{s.numero}.</span> {s.titulo?.slice(0, 60)}
            <span style={{ color: '#6b6b80' }}> — {s.tipo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
