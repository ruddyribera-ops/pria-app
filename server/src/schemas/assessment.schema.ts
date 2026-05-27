import { z } from 'zod';

const NivelRubricaSchema = z.object({
  excelente: z.string(),
  suficiente: z.string(),
  en_desarrollo: z.string(),
  inicial: z.string(),
});

const CriterioRubricaSchema = z.object({
  nombre: z.string(),
  peso: z.string(),
  niveles: NivelRubricaSchema,
});

const PreguntaAutoevalSchema = z.object({
  pregunta: z.string(),
  tipo: z.string(),
});

const AutoevaluacionSchema = z.object({
  preguntas: z.array(PreguntaAutoevalSchema),
  reflexion: z.array(z.string()),
});

const CoevaluacionSchema = z.object({
  preguntas: z.array(z.object({
    pregunta: z.string(),
    tipo: z.string(),
  })),
});

export const AssessmentSchema = z.object({
  evaluacion: z.object({
    proyecto: z.string(),
    rubrica: z.object({
      criterios: z.array(CriterioRubricaSchema).min(4).max(5),
    }),
    autoevaluacion: AutoevaluacionSchema,
    coevaluacion: CoevaluacionSchema,
    adaptaciones: z.array(z.object({
      diagnostico: z.string(),
      adaptacion: z.string(),
    })).optional(),
  }),
});

export type AssessmentOutput = z.infer<typeof AssessmentSchema>;

export function validateAssessment(data: unknown): AssessmentOutput {
  return AssessmentSchema.parse(data);
}