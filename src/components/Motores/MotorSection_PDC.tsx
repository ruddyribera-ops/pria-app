interface Props {
  result: any;
}

export default function MotorSection_PDC({ result }: Props) {
  if (!result) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
        📆 Currículo PDC Trimestral
      </div>
      {(result as any)?.pdc ? (() => {
        const p = (result as any).pdc;
        return (
          <div style={{ fontSize: '0.75rem', color: '#4a4a5a' }}>
            {p.encabezado && (
              <div style={{ background: '#f5f3ff', borderRadius: '4px', padding: '0.5rem', marginBottom: '0.5rem' }}>
                <strong>{p.encabezado.materia}</strong> — {p.encabezado.nivel} {p.encabezado.grado} | Trimestre {p.encabezado.trimestre}
              </div>
            )}
            {(p.unidades || []).map((u: any, i: number) => (
              <div key={i} style={{ marginBottom: '0.5rem', padding: '0.5rem', borderLeft: '3px solid #6D28D9' }}>
                <strong>Unidad {u.numero}: {u.titulo}</strong>
                <div style={{ color: '#6b6b80' }}>{u.semanas} — {u.horas} horas | {u.objetivo_holistico?.slice(0, 120)}</div>
                {u.contenidos && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {u.contenidos.ser && <span style={{ background: '#dbeafe', borderRadius: '3px', padding: '0.125rem 0.375rem', fontSize: '0.6875rem' }}>Ser: {u.contenidos.ser[0]}</span>}
                    {u.contenidos.saber && <span style={{ background: '#dcfce7', borderRadius: '3px', padding: '0.125rem 0.375rem', fontSize: '0.6875rem' }}>Saber: {u.contenidos.saber[0]}</span>}
                    {u.contenidos.hacer && <span style={{ background: '#fef9c3', borderRadius: '3px', padding: '0.125rem 0.375rem', fontSize: '0.6875rem' }}>Hacer: {u.contenidos.hacer[0]}</span>}
                    {u.contenidos.decidir && <span style={{ background: '#fce7f3', borderRadius: '3px', padding: '0.125rem 0.375rem', fontSize: '0.6875rem' }}>Decidir: {u.contenidos.decidir[0]}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })() : typeof result === 'object' ? (
        <div style={{ fontSize: '0.75rem' }}>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2).slice(0, 1000)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
