import { z } from 'zod';

const BloqueSchema = z.object({
  nombre: z.string(),
  duracion: z.number(),
  objetivo: z.string(),
  actividad: z.string(),
  nota: z.string().optional(),
});

const InteligenciaMultipleSchema = z.object({
  inteligencia: z.string(),
  actividad: z.string(),
});

const AdaptacionClaseSchema = z.object({
  diagnostico: z.string(),
  adaptacion: z.string(),
});

export const PlanSchema = z.object({
  mapa_cognitivo: z.object({
    verbos_bloom: z.array(z.string()),
    nivel_taxonomia: z.string(),
    enfoque_sensorial: z.string(),
  }),
  inteligencias_multiples: z.array(InteligenciaMultipleSchema).min(3),
  secuencia_didactica: z.object({
    bloques: z.array(BloqueSchema),
  }),
  dua_neuroinclusion: z.array(z.string()).optional(),
  tabla_adaptaciones_clase: z.array(AdaptacionClaseSchema).optional(),
  perfil_aula_resumido: z.string().optional(),
  recursos_necesarios: z.array(z.string()).optional(),
});

export type PlanOutput = z.infer<typeof PlanSchema>;

export function validatePlan(data: unknown): PlanOutput {
  return PlanSchema.parse(data);
}