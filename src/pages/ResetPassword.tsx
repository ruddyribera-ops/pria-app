import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './ResetPassword.module.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Validate token presence on mount
  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
    } else {
      setIsValidToken(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Token inválido o faltante');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al restablecer la contraseña');
      }
      // Redirect to login with success message
      navigate('/login?reset=success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidToken === false) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.iconError}>⚠️</div>
          <h2 className={styles.heading}>Enlace inválido</h2>
          <p className={styles.message}>
            El enlace de restablecimiento no es válido o ha expirado.
          </p>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/forgot-password')}
          >
            Solicitar nuevo enlace
          </button>
          <button
            type="button"
            className={styles.backButtonSecondary}
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
        <h2 className={styles.heading}>Nueva contraseña</h2>
        <p className={styles.subheading}>
          Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
        </p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="reset-new-password">
            Nueva contraseña
          </label>
          <input
            id="reset-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={styles.input}
            required
            autoComplete="new-password"
            minLength={8}
            disabled={isSubmitting}
            placeholder="Mínimo 8 caracteres"
          />

          <label className={styles.label} htmlFor="reset-confirm-password">
            Confirmar contraseña
          </label>
          <input
            id="reset-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={styles.input}
            required
            autoComplete="new-password"
            minLength={8}
            disabled={isSubmitting}
            placeholder="Repite la contraseña"
          />

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Restableciendo...' : 'Restablecer contraseña'}
          </button>
        </form>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => navigate('/login')}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}