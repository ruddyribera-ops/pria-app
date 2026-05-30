import { useState } from 'react';
import styles from './LoginForm.module.css';

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
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PR</div>
        <h1 className={styles.heading}>Acceso al Sistema PRIA</h1>
        <p className={styles.subheading}>Planificación e Inteligencia para el Aprendizaje</p>

        {(error || localError) && (
          <div className={styles.errorBox}>{error || localError}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="login-username">Usuario</label>
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            className={styles.input}
            disabled={isSubmitting}
            autoComplete="username"
          />

          <label className={styles.label} htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={styles.input}
            disabled={isSubmitting}
            autoComplete="current-password"
          />

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className={styles.footer}>© 2026 PRIA • Método Palma-Ribera</div>
      </div>
    </div>
  );
}
