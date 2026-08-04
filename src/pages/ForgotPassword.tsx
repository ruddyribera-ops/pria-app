import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './ForgotPassword.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
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
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Error al solicitar el restablecimiento');
      }
      // In dev (no email server) the backend returns the raw token in the
      // response body. Surface it in a copyable box so the developer can
      // complete the flow without an email inbox.
      if (data && typeof data.resetToken === 'string') {
        setDevToken(data.resetToken);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar el restablecimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyToken = async () => {
    if (!devToken) return;
    try {
      await navigator.clipboard.writeText(devToken);
    } catch {
      // Clipboard API not available (e.g. insecure context) — fall back to selection.
      const ta = document.createElement('textarea');
      ta.value = devToken;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon}>✉️</div>
          <h1 className={styles.heading}>Revisa tu correo</h1>
          <p className={styles.message}>
            Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer tu contraseña.
          </p>
          <p className={styles.hint}>Revisa también la carpeta de spam o correo no deseado.</p>
          {devToken && (
            <div className={styles.devTokenBox} role="region" aria-label="Token de desarrollo">
              <p className={styles.devTokenLabel}>
                Modo desarrollo (sin servidor de correo). Token generado:
              </p>
              <code className={styles.devTokenValue} data-testid="dev-reset-token">
                {devToken}
              </code>
              <div className={styles.devTokenActions}>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={handleCopyToken}
                  data-testid="copy-reset-token"
                >
                  Copiar token
                </button>
                <button
                  type="button"
                  className={styles.useTokenButton}
                  onClick={() => navigate(`/reset-password/${devToken}`)}
                  data-testid="use-reset-token"
                >
                  Ya tengo el token → Restablecer
                </button>
              </div>
              <p className={styles.devTokenExpiry}>
                El token expira en 1 hora y solo puede usarse una vez.
              </p>
            </div>
          )}
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
        <h1 className={styles.heading}>Restablecer contraseña</h1>
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