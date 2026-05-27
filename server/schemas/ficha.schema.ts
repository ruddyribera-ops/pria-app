import { z } from 'zod';

const OpcionOraculoSchema = z.object({
  pregunta: z.string(),
  opciones: z.array(z.string()).length(4),
  respuesta_correcta: z.string(),
});

const ItemPuenteSchema = z.object({
  palabra: z.string(),
  significado: z.string(),
});

const PergaminoSchema = z.object({
  frase_con_espacios: z.string(),
  palabras_secretas: z.array(z.string()),
});

export const FichaSchema = z.object({
  ficha_trabajo: z.object({
    titulo_gancho: z.string(),
    historia_gancho: z.string(),
    misiones: z.object({
      oraculo: z.array(OpcionOraculoSchema).optional(),
      puente: z.array(ItemPuenteSchema).optional(),
      sopa: z.array(z.string()).optional(),
      pergamino: PergaminoSchema.optional(),
      lienzo: z.string().optional(),
    }),
    adaptaciones_por_mision: z.array(z.object({
      mision: z.string(),
      diagnostico: z.string(),
      ajuste: z.string(),
    })).optional(),
  }),
});

export type FichaOutput = z.infer<typeof FichaSchema>;

export function validateFicha(data: unknown): FichaOutput {
  return FichaSchema.parse(data);
}