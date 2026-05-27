import { z } from 'zod';

const AjusteSugeridoSchema = z.object({
  area: z.string(),
  accion: z.string(),
  impacto_esperado: z.string(),
});

const AdaptacionRefinadaSchema = z.object({
  diagnostico: z.string(),
  ajuste: z.string(),
});

export const RecalibrateSchema = z.object({
  recalibracion: z.object({
    diagnostico_general: z.string(),
    fortalezas: z.array(z.string()),
    areas_mejora: z.array(z.string()),
    ajustes_sugeridos: z.array(AjusteSugeridoSchema).optional(),
    recomendaciones_proximo_trimestre: z.array(z.string()).optional(),
    adaptaciones_refinadas: z.array(AdaptacionRefinadaSchema).optional(),
  }),
});

export type RecalibrateOutput = z.infer<typeof RecalibrateSchema>;

export function validateRecalibrate(data: unknown): RecalibrateOutput {
  return RecalibrateSchema.parse(data);
}