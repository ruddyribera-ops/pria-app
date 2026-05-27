import { z } from 'zod';

export const CreateMaterialSchema = z.object({
  filename: z.string().min(1).max(255),
  tipo: z.string().max(50).optional(),
  size: z.number().int().nonnegative().optional(),
});

export const OcrSchema = z.object({
  engine: z.enum(['paddle', 'tesseract']).optional(),
  pages: z.array(z.number().int().positive()).optional(),
});