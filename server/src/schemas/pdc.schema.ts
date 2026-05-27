import { z } from 'zod';

const ContenidosDimensionSchema = z.object({
  ser: z.array(z.string()).optional(),
  saber: z.array(z.string()).optional(),
  hacer: z.array(z.string()).optional(),
  decidir: z.array(z.string()).optional(),
});

const UnidadPDCSchema = z.object({
  numero: z.number().int().min(1),
  titulo: z.string(),
  semanas: z.string(),
  horas: z.number(),
  objetivo_holistico: z.string(),
  contenidos: ContenidosDimensionSchema,
  metodologia_dua: z.array(z.string()).optional(),
  evaluacion: z.object({
    formativa: z.string().optional(),
    sumativa: z.string().optional(),
  }).optional(),
});

export const PDCSchema = z.object({
  pdc: z.object({
    encabezado: z.object({
      nivel: z.string(),
      grado: z.string(),
      materia: z.string(),
      trimestre: z.number().int().min(1).max(4),
      ano_escolar: z.number().int(),
    }),
    unidades: z.array(UnidadPDCSchema),
    observaciones: z.object({
      adaptaciones: z.array(z.string()).optional(),
      notas_docente: z.string().optional(),
    }).optional(),
  }),
});

export type PDCOutput = z.infer<typeof PDCSchema>;

export function validatePDC(data: unknown): PDCOutput {
  return PDCSchema.parse(data);
}