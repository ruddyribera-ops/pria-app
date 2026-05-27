import { z } from 'zod';

const ObjetivoDiarioSchema = z.object({
  dia: z.number().int().min(1).max(7),
  objetivo: z.string(),
  criterio_logro: z.string(),
  actividad_clave: z.string(),
});

const SemanaSchema = z.object({
  semana: z.number().int().min(1),
  tema: z.string(),
  objetivos_diarios: z.array(ObjetivoDiarioSchema),
});

const EvaluacionSemanalSchema = z.object({
  semana: z.number().int(),
  indicadores: z.array(z.string()),
  instrumento: z.string(),
});

export const MicroSchema = z.object({
  micro_objetivos: z.object({
    unidad: z.string(),
    semanas: z.array(SemanaSchema),
    evaluacion_semanal: z.array(EvaluacionSemanalSchema).optional(),
  }),
});

export type MicroOutput = z.infer<typeof MicroSchema>;

export function validateMicro(data: unknown): MicroOutput {
  return MicroSchema.parse(data);
}