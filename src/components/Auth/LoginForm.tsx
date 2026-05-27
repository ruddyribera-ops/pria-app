import { useState } from 'react';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  error: string | null;
}

export default function LoginForm({ onLogin, error }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await onLogin(username, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: '#1c1e24', justifyContent: 'center', alignItems: 'center', padding: '2rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '2.5rem', width: '100%',
        maxWidth: '420px', border: '1px solid #e6e6eb', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        textAlign: 'center', boxSizing: 'border-box',
      }}>
        <div style={{
          width: '64px', height: '64px', background: '#3A9E5E', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem', fontSize: '1.5rem', color: '#fff', fontWeight: 700,
        }}>
          PR
        </div>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.25rem' }}>
          Acceso al Sistema PRIA
        </h1>
        <p style={{ fontSize: '0.8125rem', color: '#6b6b80', marginBottom: '1.75rem' }}>
          Planificación e Inteligencia para el Aprendizaje
        </p>

        {(error || localError) && (
          <div style={{
            background: '#fef2f2', color: '#dc2626', padding: '0.5rem 0.75rem',
            borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '1rem',
          }}>
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{
            display: 'block', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600,
            color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem',
          }}>
            Usuario
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            style={{
              width: '100%', padding: '0.75rem 1rem', border: '1px solid #d4d4e0',
              borderRadius: '4px', fontSize: '0.875rem', marginBottom: '1.125rem',
              outline: 'none', background: '#f8f8ff', transition: 'border .2s, box-shadow .2s',
              boxSizing: 'border-box',
            }}
            disabled={isSubmitting}
          />
          <label style={{
            display: 'block', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600,
            color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem',
          }}>
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%', padding: '0.75rem 1rem', border: '1px solid #d4d4e0',
              borderRadius: '4px', fontSize: '0.875rem', marginBottom: '1.125rem',
              outline: 'none', background: '#f8f8ff', transition: 'border .2s, box-shadow .2s',
              boxSizing: 'border-box',
            }}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%', padding: '0.85rem', background: isSubmitting ? '#2d7a48' : '#3A9E5E',
              color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.9375rem',
              fontWeight: 500, cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#6b6b80' }}>
          © 2026 PRIA • Método Palma-Ribera
        </div>
      </div>
    </div>
  );
}