import { z } from 'zod';

const SlideSchema = z.object({
  numero: z.number().int().min(1).max(10),
  tipo: z.enum(['portada', 'objetivos', 'concepto', 'pausa', 'cierre']),
  titulo: z.string(),
  texto_pantalla: z.string(),
  guion_docente: z.string(),
  prompt_imagen: z.string().optional(),
  callout: z.string().optional(),
});

export const SlidesSchema = z.array(SlideSchema).length(10);

export type SlidesOutput = z.infer<typeof SlidesSchema>;

export function validateSlides(data: unknown): SlidesOutput {
  return SlidesSchema.parse(data);
}