import { z } from 'zod';

export const CreateCurriculumSchema = z.object({
  material_id: z.number().int().positive().optional().nullable(),
  unidad_real: z.string().min(1).max(200),
  temas: z.array(z.string()).min(1),
  contenido_temas: z.record(z.string(), z.string()),
  paginas_temas: z.record(z.string(), z.string()),
  raw_text: z.string().optional(),
});