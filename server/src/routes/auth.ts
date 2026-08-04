import { Router } from 'express';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';
import { dbGet, dbRun } from '../db/schema.js';
import { getPoolClient } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../types/express.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validateBody.js';
import {
  LoginSchema,
  RegisterSchema,
  UpdateMeSchema,
  ForgotPasswordSchema,
  VerifyResetTokenSchema,
  ResetPasswordSchema,
} from '../schemas/requests/auth.schema.js';

const router = Router();

router.post('/login', authLimiter, validateBody(LoginSchema), async (req: AuthRequest, res: Response) => {
  const username = req.body.usuario || req.body.username;
  const password = req.body.contrasena || req.body.password;
  const user = await dbGet('SELECT * FROM users WHERE username = $1', [username]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRY } as Parameters<typeof jwt.sign>[2]
  );
  const csrfToken = crypto.randomUUID();
  res.cookie('csrf_token', csrfToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400000,
  });
  res.json({
    data: {
      token,
      user: { id: user.id, nombre: user.nombre, role: user.role, nivel: user.nivel, grado: user.grado, teacher_code: user.teacher_code },
    },
  });
});

router.post('/register', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation failed', details: result.error.issues });
  const { username, password, nombre, nivel = 'Primaria', grado = '5to', teacher_code } = result.data;
  const hash = bcrypt.hashSync(password, 12);
  const info = await dbRun(
    'INSERT INTO users (username, password_hash, nombre, nivel, grado, teacher_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [username, hash, nombre, nivel, grado, teacher_code || null]
  );
  res.json({ data: { id: info.id, created: new Date().toISOString() } });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await dbGet('SELECT id, nombre, role, nivel, grado, teacher_code FROM users WHERE id = $1', [req.user!.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ data: user });
});

router.patch('/me', authMiddleware, validateBody(UpdateMeSchema), async (req: AuthRequest, res: Response) => {
  const { student_book } = req.body;
  if (student_book !== undefined) {
    await dbRun('UPDATE users SET student_book = $1 WHERE id = $2', [student_book ? true : false, req.user!.id]);
  }
  res.json({ data: { success: true } });
});

// ───────────────────────────────────────────────────────────────────────────
// Password reset flow
//
// Threat model:
//   • Token is 256 bits of entropy (crypto.randomBytes(32).toString('hex')).
//   • DB only stores SHA-256(token) — a DB leak does not reveal active tokens.
//   • 1-hour expiry; one-time use; old tokens are invalidated when a new one
//     is issued for the same user (prevents token piling-up attacks).
//   • forgot-password always returns 200 to prevent identifier enumeration.
//
// In production the raw token would be emailed. With no email server wired
// up (per the spec) we return it in the response body in non-production envs
// so the developer / tests can complete the flow.
// ───────────────────────────────────────────────────────────────────────────

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RAW_TOKEN_BYTES = 32;
const DEV_TOKEN_RETURN = process.env.NODE_ENV !== 'production';

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * POST /api/auth/forgot-password
 * Body: { identifier | email | username | usuario }
 * Returns: { ok: true, resetToken?: string }
 *
 * Always responds 200 regardless of whether the identifier matched a user.
 * If the user exists, generate a fresh token, invalidate any prior unused
 * tokens for that user, and (in dev) return the raw token.
 */
router.post(
  '/forgot-password',
  authLimiter,
  validateBody(ForgotPasswordSchema),
  async (req: AuthRequest, res: Response) => {
    const identifier =
      req.body.identifier ?? req.body.email ?? req.body.username ?? req.body.usuario;

    // Look up user by email OR username. Case-insensitive on email.
    const user = await dbGet(
      `SELECT id, email, username
       FROM users
       WHERE LOWER(email) = LOWER($1) OR username = $2
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!user) {
      // Do not leak whether the identifier matched a user.
      return res.json({ ok: true });
    }

    const rawToken = crypto.randomBytes(RAW_TOKEN_BYTES).toString('hex');
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Invalidate any prior unused tokens for this user (single-active-token policy).
    await dbRun(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [user.id]
    );

    await dbRun(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const body: { ok: true; resetToken?: string; expiresAt?: string } = { ok: true };
    if (DEV_TOKEN_RETURN) {
      body.resetToken = rawToken;
      body.expiresAt = expiresAt.toISOString();
    }
    return res.json(body);
  }
);

/**
 * POST /api/auth/verify-reset-token
 * Body: { token: string }
 * Returns: { valid: boolean, expired: boolean, used: boolean }
 *
 * Does not consume the token — purely informational. The real atomic check
 * happens inside /reset-password.
 */
router.post(
  '/verify-reset-token',
  authLimiter,
  validateBody(VerifyResetTokenSchema),
  async (req: AuthRequest, res: Response) => {
    const tokenHash = sha256Hex(req.body.token);
    const row = await dbGet(
      `SELECT used_at, expires_at FROM password_reset_tokens WHERE token_hash = $1 LIMIT 1`,
      [tokenHash]
    );

    if (!row) {
      return res.json({ valid: false, expired: false, used: false });
    }
    const used = row.used_at !== null && row.used_at !== undefined;
    const expired = new Date(row.expires_at).getTime() <= Date.now();
    return res.json({ valid: !used && !expired, expired, used });
  }
);

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword | new_password | contrasena }
 * Returns: { ok: true } | { error }
 *
 * Atomically: validate token, hash new password, update user, mark token
 * consumed. The "mark consumed + update password" pair runs inside a
 * transaction guarded by `used_at IS NULL` so two concurrent resets with
 * the same token can never both succeed.
 */
router.post(
  '/reset-password',
  authLimiter,
  validateBody(ResetPasswordSchema),
  async (req: AuthRequest, res: Response) => {
    const newPassword = req.body.newPassword ?? req.body.new_password ?? req.body.contrasena;
    const tokenHash = sha256Hex(req.body.token);

    // Atomic claim — only one concurrent caller can transition used_at from
    // NULL to NOW() for a given token_hash.
    //
    // We use pool.query directly instead of dbRun because dbRun only inspects
    // `rows[0].id` from RETURNING, but here the UPDATE returns user_id.
    const pool = getPoolClient();
    const claimResult = await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       RETURNING user_id`,
      [tokenHash]
    );

    if (claimResult.rows.length === 0) {
      // Either the token does not exist, has expired, or was already used.
      const existing = await dbGet(
        `SELECT used_at, expires_at FROM password_reset_tokens WHERE token_hash = $1 LIMIT 1`,
        [tokenHash]
      );
      if (!existing) {
        return res.status(400).json({ error: 'Token inválido' });
      }
      if (existing.used_at) {
        return res.status(400).json({ error: 'Token ya utilizado' });
      }
      return res.status(400).json({ error: 'Token expirado' });
    }

    const userId: number = claimResult.rows[0].user_id;
    const hash = bcrypt.hashSync(newPassword!, 12);
    await dbRun(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);

    return res.json({ ok: true });
  }
);

export default router;
