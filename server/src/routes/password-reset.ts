import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { dbGet, dbRun } from '../db/schema.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import type { Request, Response } from 'express';

const router = Router();

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Zod schemas
const ForgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  new_password: z.string().min(8).max(128),
});

// Rate limiter: 3 forgot-password requests per hour per IP
const forgotPasswordLimiter = createRateLimiter(3, 60 * 60 * 1000);

/**
 * POST /api/auth/forgot-password
 * Send a password reset link to the user's email.
 * Always returns success — don't reveal whether email exists.
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  const parse = ForgotPasswordSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const { email } = parse.data;

  // Find user by email (case-insensitive)
  const user = await dbGet('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);

  if (user) {
    const userId = user.id;

    // Generate raw token (64 hex chars = 32 bytes)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    // Invalidate any existing unused tokens for this user
    await dbRun(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );

    // Insert new token
    await dbRun(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(email, resetLink);
  }

  // ALWAYS return success — prevent email enumeration
  res.json({ message: 'Si existe una cuenta con ese email, se ha enviado un enlace de restablecimiento.' });
});

/**
 * POST /api/auth/reset-password
 * Complete the password reset using the token.
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  const parse = ResetPasswordSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Token o contraseña inválidos. La contraseña debe tener al menos 8 caracteres.' });
  }

  const { token, new_password } = parse.data;

  // Hash the token to look it up
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find a valid, unused, non-expired token
  const resetToken = await dbGet(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  if (!resetToken) {
    return res.status(400).json({ error: 'Token inválido o expirado.' });
  }

  const { id: tokenId, user_id: userId } = resetToken;

  // Hash the new password and update the user
  const passwordHash = bcrypt.hashSync(new_password, 12);
  await dbRun('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);

  // Mark the token as used (prevents reuse)
  await dbRun('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [tokenId]);

  res.json({ message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' });
});

export default router;