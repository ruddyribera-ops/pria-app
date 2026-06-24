import { z } from 'zod';

export const SourceNarratorSchema = z.object({
  narrative_summary: z.string().min(100).max(800),
  characters: z.array(z.object({
    name: z.string(),
    role: z.string(),
    description: z.string(),
    key_quote: z.string().nullable().optional()
  })),
  sequence: z.array(z.object({
    order: z.number().int().min(1),
    event: z.string(),
    significance: z.string()
  })).min(1),
  examples: z.array(z.object({
    type: z.enum(['historical', 'cultural', 'scientific', 'anecdotal', 'mythological']),
    content: z.string(),
    source_quote: z.string().nullable().optional()
  })),
  cultural_anchors: z.array(z.object({
    term: z.string(),
    definition: z.string(),
    context: z.string()
  })),
  vivid_details: z.array(z.string())
});

export type SourceNarratorOutput = z.infer<typeof SourceNarratorSchema>;

export function validateSourceNarrator(data: unknown): SourceNarratorOutput {
  return SourceNarratorSchema.parse(data);
}
