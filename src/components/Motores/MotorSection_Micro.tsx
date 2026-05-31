import type { MicroOutput } from '../../types/motor-types';

interface Props {
  result: MicroOutput | null;
}

export default function MotorSection_Micro({ result }: Props) {
  if (!result) return null;
  const mo = result.micro_objetivos;
  if (!mo) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
        🎯 Micro-Objetivos Diarios
      </div>
      <div style={{ fontSize: '0.75rem', color: '#4a4a5a' }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: '#DB2777' }}>Unidad: {mo.unidad}</div>
        {(mo.semanas || []).map((sem, si) => (
          <div key={si} style={{ marginBottom: '0.75rem', padding: '0.5rem', background: '#fdf2f8', borderRadius: '4px' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Semana {sem.semana}: {sem.tema}</div>
            {(sem.objetivos_diarios || []).map((obj, di) => (
              <div key={di} style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #DB2777', marginTop: '0.25rem' }}>
                <strong>Día {obj.dia}:</strong> {obj.objetivo}
                <div style={{ color: '#6b6b80', fontSize: '0.6875rem' }}>→ {obj.criterio_logro}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
