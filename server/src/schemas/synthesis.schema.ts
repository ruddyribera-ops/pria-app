import { z } from 'zod';

const TemaDesarrolladoSchema = z.object({
  nombre: z.string(),
  conceptos_clave: z.array(z.string()).min(2),
  inteligencias_sugeridas: z.array(z.string()),
  actividades: z.array(z.object({
    tipo: z.string(),
    inteligencia: z.string(),
  })).min(2),
});

const UnidadSintetizadaSchema = z.object({
  titulo: z.string().min(3).max(200),
  enfoque_didactico: z.string(),
  temas_desarrollados: z.array(TemaDesarrolladoSchema),
  notas_docente: z.string().optional(),
  proyecto_pbl: z.string().optional(),
});

export const SynthesisSchema = z.object({
  unidad_sintetizada: UnidadSintetizadaSchema,
});

export type SynthesisOutput = z.infer<typeof SynthesisSchema>;

export function validateSynthesis(data: unknown): SynthesisOutput {
  return SynthesisSchema.parse(data);
}