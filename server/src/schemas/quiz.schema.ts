import { z } from 'zod';

const PreguntaQuizSchema = z.object({
  numero: z.number().int().min(1),
  tipo: z.enum(['escrita', 'oral', 'visual', 'desafio']),
  pregunta: z.string(),
  opciones: z.array(z.string()).optional(),
  respuesta: z.string().nullish(), // nullish permite null E undefined — necesario para preguntas orales/visuales sin respuesta de texto
});

const ClaveRespuestaSchema = z.object({
  pregunta: z.number(),
  respuesta: z.string().nullish(),
  explicacion: z.string().nullish(),
});

export const QuizSchema = z.object({
  quiz: z.object({
    titulo: z.string(),
    instrucciones: z.string(),
    preguntas: z.array(PreguntaQuizSchema),
    clave_respuestas: z.array(ClaveRespuestaSchema).optional(),
    adaptaciones: z.array(z.object({
      diagnostico: z.string(),
      adaptacion: z.string(),
    })).optional(),
  }),
});

export type QuizOutput = z.infer<typeof QuizSchema>;

export function validateQuiz(data: unknown): QuizOutput {
  return QuizSchema.parse(data);
}