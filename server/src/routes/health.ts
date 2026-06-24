import { Router } from 'express';
import { getPoolClient } from '../db/connection.js';

const router = Router();

const startTime = Date.now();

router.get('/', async (req, res) => {
  const checkStart = Date.now();
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  let dbLatencyMs = -1;

  try {
    const pool = getPoolClient();
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (err) {
    req.log?.warn({ err }, 'Health check: DB query failed');
    dbStatus = 'disconnected';
  }

  const healthy = dbStatus === 'connected';
  const responseTimeMs = Date.now() - checkStart;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    db: dbStatus,
    dbLatencyMs,
    responseTimeMs,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

export default router;
