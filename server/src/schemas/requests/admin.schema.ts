import { z } from 'zod';

export const CreateUserSchema = z.object({
  nombre: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
  usuario: z.string().min(3, 'Usuario mínimo 3 caracteres').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y _'),
  password: z.string().min(6, 'Contraseña mínimo 6 caracteres').max(128),
  nivel: z.enum(['Primaria', 'Secundaria']).optional(),
  grado: z.string().max(20).optional(),
});