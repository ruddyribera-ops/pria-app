import type { RecalibrateOutput } from '../../types/motor-types';

interface Props {
  result: RecalibrateOutput | null;
}

export default function MotorSection_Recalibrate({ result }: Props) {
  if (!result) return null;
  const r = result.recalibracion;
  if (!r) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
        🔄 Recalibración Adaptativa
      </div>
      <div style={{ fontSize: '0.75rem', color: '#4a4a5a' }}>
        <div style={{ background: '#fff7ed', borderRadius: '4px', padding: '0.5rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>
          {r.diagnostico_general}
        </div>
        {r.fortalezas && r.fortalezas.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: '#059669' }}>✓ Fortalezas:</strong> {r.fortalezas.join(', ')}
          </div>
        )}
        {r.areas_mejora && r.areas_mejora.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: '#D97706' }}>↗ Áreas de mejora:</strong> {r.areas_mejora.join(', ')}
          </div>
        )}
        {r.ajustes_sugeridos && r.ajustes_sugeridos.length > 0 && (
          <div>
            <strong>Ajuste sugerido:</strong>
            {r.ajustes_sugeridos.map((a) => (
              <div key={a.area} style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #EA580C' }}>
                <strong>{a.area}:</strong> {a.accion} <span style={{ color: '#6b6b80' }}>(impacto: {a.impacto_esperado})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
