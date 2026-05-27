import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import materialsRouter from './routes/materials.js';
import motoresRouter from './routes/motores.js';
import scheduleRouter from './routes/schedule.js';
import diagnosticosRouter from './routes/diagnosticos.js';
import curriculumsRouter from './routes/curriculums.js';
import aiRouter from './routes/ai.js';
import { errorHandler } from './middleware/errorHandler.js';

export async function createApp() {
  const app = express();

  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json({ limit: '50mb' }));

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/materials', materialsRouter);
  app.use('/api/motores', motoresRouter);
  app.use('/api/schedule', scheduleRouter);
  app.use('/api/diagnosticos', diagnosticosRouter);
  app.use('/api/curriculums', curriculumsRouter);
  app.use('/api/ai', aiRouter);

  // Error handler
  app.use(errorHandler);

  return app;
}
