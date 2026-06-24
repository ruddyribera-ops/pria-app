import nodemailer from 'nodemailer';

const SMTP_URL = process.env.SMTP_URL;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@pria.app';

let transporter: nodemailer.Transporter | null = null;

if (SMTP_URL) {
  transporter = nodemailer.createTransport(SMTP_URL);
} else {
  console.warn('[EMAIL] SMTP_URL not set — password reset links will be logged to console');
}

/**
 * Send a password reset email to the user.
 * Falls back to console.log if SMTP_URL is not configured.
 */
export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  if (!transporter) {
    console.log(`[EMAIL] Password reset for ${to}: ${resetLink}`);
    return;
  }

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: 'Restablece tu contraseña — PRIA',
    text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}\n\nEste enlace expira en 1 hora. Si no solicitaste este correo, puedes ignorarlo.`,
    html: `
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <p><a href="${resetLink}" target="_blank" rel="noopener noreferrer">${resetLink}</a></p>
      <p><strong>Este enlace expira en 1 hora.</strong></p>
      <p>Si no solicitaste este correo, puedes ignorarlo.</p>
    `,
  });
};