import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env relative to this file (works whether cwd is root or server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// Trim all env values to fix any trailing whitespace issues
for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === 'string') {
    (process.env as any)[key] = value.trim();
  }
}

const envSchema = z.object({
  // MINIMAX_API_KEY is validated at the service layer — motors fall back to mock data when empty
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  MINIMAX_MODEL: z.string().default('MiniMax-M2.7'),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid .env:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const config = validateEnv();