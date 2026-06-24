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
});

export const UpdateMeSchema = z.object({
  student_book: z.boolean().optional(),
});