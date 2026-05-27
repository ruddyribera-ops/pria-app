interface Props {
  result: any;
}

export default function MotorSection_Ficha({ result }: Props) {
  if (!result) return null;
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
        🎮 Ficha Gamificada
      </div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#DC2626' }}>
        {(result as any)?.ficha_trabajo?.titulo_gancho}
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#4a4a5a', marginTop: '0.25rem' }}>
        {(result as any)?.ficha_trabajo?.historia_gancho?.slice(0, 200)}
      </div>
    </div>
  );
}
