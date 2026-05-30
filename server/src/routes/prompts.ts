import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, '../motores/prompts');

const VALID_KEYS = [
  'synthesis',
  'abp',
  'assessment',
  'plan',
  'slides',
  'ficha',
  'quiz',
  'tutor',
  'pdc',
  'recalibrate',
  'micro',
  'alpha2',
];

const router = Router();

// GET /api/prompts/:motorKey — returns raw prompt text for debugging/inspection
router.get('/:motorKey', (req, res) => {
  const { motorKey } = req.params;

  if (!VALID_KEYS.includes(motorKey)) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  try {
    const filePath = join(PROMPTS_DIR, `${motorKey}.md`);
    const content = readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(content);
  } catch {
    res.status(500).json({ error: 'Failed to load prompt' });
  }
});

export default router;
