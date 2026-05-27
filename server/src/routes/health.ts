import { Router } from 'express';
import { getPoolClient } from '../db/connection.js';

const router = Router();

const startTime = Date.now();

router.get('/', async (req, res) => {
  let dbStatus = 'ok';
  try {
    const pool = getPoolClient();
    await pool.query('SELECT 1');
  } catch {
    dbStatus = 'error';
  }

  const healthy = dbStatus === 'ok';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    checks: {
      server: 'ok',
      database: dbStatus,
    },
    version: '10.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

export default router;
