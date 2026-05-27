import { z } from 'zod';

const FaseSchema = z.object({
  nombre: z.string(),
  duracion: z.string(),
  actividades: z.array(z.string()).min(2),
  adaptaciones: z.array(z.object({
    diagnostico: z.string(),
    adaptacion: z.string(),
  })).optional(),
});

const EvaluacionSchema = z.object({
  criterios: z.array(z.string()),
  instrumentos: z.array(z.string()),
});

export const ABPProjectSchema = z.object({
  proyecto: z.object({
    titulo: z.string(),
    pregunta_generadora: z.string(),
    fases: z.array(FaseSchema).min(3),
    productos: z.array(z.string()).min(1),
    adaptaciones_inclusivas: z.array(z.object({
      diagnostico: z.string(),
      adaptacion: z.string(),
    })).optional(),
    evaluacion: EvaluacionSchema,
  }),
});

export type ABPOutput = z.infer<typeof ABPProjectSchema>;

export function validateABP(data: unknown): ABPOutput {
  return ABPProjectSchema.parse(data);
}