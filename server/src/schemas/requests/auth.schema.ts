import { z } from 'zod';

export const LoginSchema = z.object({
  // Accept both client naming (usuario/contrasena) and test naming (username/password)
  usuario: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  contrasena: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
}).refine(data => data.usuario || data.username, {
  message: 'Usuario requerido',
}).refine(data => data.contrasena || data.password, {
  message: 'Contraseña requerida',
});

export const RegisterSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y _'),
  password: z.string().min(6).max(128),
  nombre: z.string().min(2).max(100),
  nivel: z.enum(['Primaria', 'Secundaria']).optional(),
  grado: z.string().optional(),
  teacher_code: z.string().optional(),
});

export const UpdateMeSchema = z.object({
  student_book: z.boolean().optional(),
});

/**
 * Forgot-password accepts any of: identifier | email | username | usuario.
 * We accept all three so the existing UI (sends `email`) and the spec's
 * `identifier` (or `username`) all flow through the same handler.
 * Returns 200 with `ok: true` regardless of whether the user exists to
 * avoid leaking which identifiers are registered (prevents enumeration).
 */
export const ForgotPasswordSchema = z
  .object({
    identifier: z.string().min(1).max(255).optional(),
    email: z.string().min(1).max(255).optional(),
    username: z.string().min(1).max(50).optional(),
    usuario: z.string().min(1).max(50).optional(),
  })
  .refine(
    (d) => Boolean(d.identifier || d.email || d.username || d.usuario),
    { message: 'Identifier (email or username) requerido' }
  );

export const VerifyResetTokenSchema = z.object({
  token: z.string().min(1).max(256),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1).max(256),
    newPassword: z.string().min(8).max(128).optional(),
    new_password: z.string().min(8).max(128).optional(),
    contrasena: z.string().min(8).max(128).optional(),
  })
  .refine(
    (d) => Boolean(d.newPassword || d.new_password || d.contrasena),
    { message: 'newPassword required (min 8 chars)' }
  );