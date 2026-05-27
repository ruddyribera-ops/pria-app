import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
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