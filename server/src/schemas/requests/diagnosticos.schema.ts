import { z } from 'zod';

export const CreateDiagnosticoSchema = z.object({
  estudiante: z.string().min(2).max(100),
  nivel: z.enum(['Primaria', 'Secundaria']),
  area: z.string().max(200).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').optional(),
  resultado: z.string().max(5000).optional(),
});

export const UpdateDiagnosticoSchema = z.object({
  estudiante: z.string().min(2).max(100).optional(),
  nivel: z.enum(['Primaria', 'Secundaria']).optional(),
  area: z.string().max(200).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').optional(),
  resultado: z.string().max(5000).optional(),
});