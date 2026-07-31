import { z } from 'zod';

const SlideSchema = z.object({
  numero: z.number().int().min(1).max(20),
  tipo: z.enum(['portada', 'objetivos', 'concepto', 'pausa', 'cierre']),
  titulo: z.string(),
  texto_pantalla: z.string().nullish(),
  guion_docente: z.string().nullish(),
  prompt_imagen: z.string().nullish(),
  prompt_imagen_variations: z.array(z.object({
    estilo: z.enum(['ilustracion_infantil', 'documental_educativo', 'artistico_cultural', 'diagrama_visual']),
    prompt: z.string(),
    herramienta_recomendada: z.enum(['bing', 'leonardo', 'ideogram', 'cualquiera']),
  })).nullish(),
  alt_text: z.string().nullish(),
  callout: z.string().nullish(),
});

export const SlidesSchema = z.array(SlideSchema).min(1).max(20);

export type SlidesOutput = z.infer<typeof SlidesSchema>;

export function validateSlides(data: unknown): SlidesOutput {
  return SlidesSchema.parse(data);
}