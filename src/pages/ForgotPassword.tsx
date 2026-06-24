import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './ForgotPassword.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al solicitar el restablecimiento');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar el restablecimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon}>✉️</div>
          <h2 className={styles.heading}>Revisa tu correo</h2>
          <p className={styles.message}>
            Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer tu contraseña.
          </p>
          <p className={styles.hint}>Revisa también la carpeta de spam o correo no deseado.</p>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/login')}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PR</div>
        <h2 className={styles.heading}>Restablecer contraseña</h2>
        <p className={styles.subheading}>
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={styles.input}
            required
            autoComplete="email"
            disabled={isSubmitting}
          />

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.backLink}>
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}