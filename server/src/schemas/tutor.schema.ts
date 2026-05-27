import { z } from 'zod';

const MomentoCriticoSchema = z.object({
  momento: z.string(),
  accion: z.string(),
  senial: z.string(),
});

const AdaptacionRapidaSchema = z.object({
  diagnostico: z.string(),
  senial: z.string(),
  intervencion: z.string(),
});

const PreguntaFrecuenteSchema = z.object({
  pregunta: z.string(),
  respuesta_breve: z.string(),
});

export const TutorSchema = z.object({
  panel_tutor: z.object({
    resumen_clase: z.string(),
    puntos_clave: z.array(z.string()),
    momentos_criticos: z.array(MomentoCriticoSchema).optional(),
    checklist_pre_clase: z.array(z.string()).optional(),
    adaptaciones_rapidas: z.array(AdaptacionRapidaSchema).optional(),
    preguntas_frecuentes: z.array(PreguntaFrecuenteSchema).optional(),
  }),
});

export type TutorOutput = z.infer<typeof TutorSchema>;

export function validateTutor(data: unknown): TutorOutput {
  return TutorSchema.parse(data);
}