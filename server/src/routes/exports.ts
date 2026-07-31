import { Router } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authMiddleware } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PPTX_SCRIPT = path.resolve(__dirname, '../../scripts/pptx_gen.py');
const PYTHON_EXECUTABLE = 'C:\\Users\\Windows\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';

const router = Router();
router.use(authMiddleware);

router.post('/pptx', (req, res) => {
  const { motor, output, teacherInfo } = req.body || {};

  if (!motor || !output) {
    return res.status(400).json({ error: 'Missing motor or output' });
  }

  const payload = JSON.stringify({ motor, output, teacherInfo: teacherInfo || {} });
  const child = spawn(PYTHON_EXECUTABLE, [PPTX_SCRIPT], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let stdout = Buffer.alloc(0);
  let stderr = '';
  let responseSent = false;

  child.stdout.on('data', (chunk: Buffer) => {
    stdout = Buffer.concat([stdout, chunk]);
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  child.on('error', (err) => {
    console.error('[exports/pptx] spawn error:', err);
    if (!res.headersSent) {
      responseSent = true;
      res.status(500).json({ error: 'Failed to spawn python', detail: String(err) });
    }
  });

  child.on('close', (code: number | null) => {
    if (responseSent || res.headersSent) return;

    if (code !== 0) {
      console.error('[exports/pptx] python exit', code, stderr);
      responseSent = true;
      return res.status(500).json({
        error: 'PPTX generation failed',
        detail: stderr.slice(-500),
        exitCode: code,
      });
    }

    if (!stdout.slice(0, 2).equals(Buffer.from([0x50, 0x4b]))) {
      console.error('[exports/pptx] output not a valid zip, first 16 bytes:', stdout.slice(0, 16));
      responseSent = true;
      return res.status(500).json({
        error: 'PPTX output invalid (not a zip)',
        firstBytes: stdout.slice(0, 16).toString('hex'),
      });
    }

    const safeMotor = String(motor).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'export';
    const filename = `PRIA_${safeMotor}_${Date.now()}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(stdout.length));
    responseSent = true;
    res.send(stdout);
  });

  child.stdin.end(payload);
});

export default router;
