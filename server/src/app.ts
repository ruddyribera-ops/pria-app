import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { pinoHttp as pinoHttpFn } from 'pino-http';
import { config } from './config.js';
import type { Request, Response } from 'express';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import materialsRouter from './routes/materials.js';
import motoresRouter from './routes/motores.js';
import scheduleRouter from './routes/schedule.js';
import diagnosticosRouter from './routes/diagnosticos.js';
import curriculumsRouter from './routes/curriculums.js';
import aiRouter from './routes/ai.js';
import blocksRouter from './routes/blocks.js';
import promptsRouter from './routes/prompts.js';
import { errorHandler } from './middleware/errorHandler.js';

// Init Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

export async function createApp() {
  const app = express();

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }));
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.minimax.io;"
    );
    next();
  });

  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json({ limit: '10mb' }));

  // Structured request logging
  app.use(pinoHttpFn({
    autoLogging: {
      ignore: (req: Request) => req.url === '/api/health',
    },
    customLogLevel: (_req: Request, res: Response, err: Error | undefined) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req: Request) => ({ method: req.method, url: req.url, query: req.query }),
      res: (res: Response) => ({ statusCode: res.statusCode }),
    },
  }));

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/materials', materialsRouter);
  app.use('/api/motores', motoresRouter);
  app.use('/api/schedule', scheduleRouter);
  app.use('/api/diagnosticos', diagnosticosRouter);
  app.use('/api/curriculums', curriculumsRouter);
  app.use('/api/blocks', authMiddleware, blocksRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/prompts', promptsRouter);

  // Error handler
  app.use(errorHandler);

  return app;
}
