interface Props {
  result: any;
}

export default function MotorSection_Tutor({ result }: Props) {
  if (!result) return null;
  const pt = (result as any)?.panel_tutor;
  if (!pt) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
        🎓 Panel del Tutor
      </div>
      <div style={{ fontSize: '0.75rem', color: '#4a4a5a' }}>
        <div style={{ marginBottom: '0.5rem' }}><strong>Resumen:</strong> {pt.resumen_clase}</div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Puntos clave:</strong> {(pt.puntos_clave || []).map((p: string, i: number) => (
            <span key={i} style={{ display: 'inline-block', background: '#e0f2fe', borderRadius: '4px', padding: '0.125rem 0.5rem', margin: '0.125rem' }}>{p}</span>
          ))}
        </div>
        {pt.momentos_criticos && pt.momentos_criticos.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong> Momentos críticos:</strong>
            {pt.momentos_criticos.map((m: any, i: number) => (
              <div key={i} style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #0891B2', marginTop: '0.25rem' }}>
                <strong>{m.momento}:</strong> {m.accion} → {m.senial}
              </div>
            ))}
          </div>
        )}
        {pt.adaptaciones_rapidas && pt.adaptaciones_rapidas.length > 0 && (
          <div>
            <strong>Adaptaciones rápidas:</strong>
            {pt.adaptaciones_rapidas.map((a: any, i: number) => (
              <div key={i} style={{ color: '#9333EA' }}>→ {a.diagnostico}: {a.intervencion}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
