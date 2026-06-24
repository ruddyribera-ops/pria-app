import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#1c1e24', color: '#fff', gap: '1rem', padding: '2rem',
    }}>
      <div style={{
        width: '80px', height: '80px', background: '#3A9E5E', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem', fontWeight: 700, color: '#fff',
      }}>
        PR
      </div>
      <h1 style={{ fontSize: '3rem', fontWeight: 700, margin: 0 }}>404</h1>
      <p style={{ fontSize: '1rem', color: '#b3b3cc', margin: 0 }}>
        Página no encontrada
      </p>
      <button
        type="button"
        onClick={() => navigate('/diario')}
        style={{
          marginTop: '1rem', padding: '0.75rem 2rem', background: '#3A9E5E',
          color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.875rem',
          fontWeight: 500, cursor: 'pointer',
        }}
      >
        Volver al inicio
      </button>
    </div>
  );
}
