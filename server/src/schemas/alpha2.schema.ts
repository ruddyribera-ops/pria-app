import { z } from 'zod';

export const Alpha2Schema = z.object({
  unidad_real: z.string().min(1),
  temas: z.array(z.string()).min(1),
  contenido_temas: z.record(z.string(), z.string().min(10)),
  paginas_temas: z.record(z.string(), z.string()),
});

export type Alpha2Output = z.infer<typeof Alpha2Schema>;

export function validateAlpha2(data: unknown): Alpha2Output {
  return Alpha2Schema.parse(data);
}