import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import * as fs from 'fs';
import { sentryBeforeSend } from './lib/sentry-scrubber.js';
import { pinoHttp as pinoHttpFn } from 'pino-http';
import { config } from './config.js';
import type { Request, Response } from 'express';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { cspReportOnlyMiddleware, cspReportHandler } from './middleware/csp.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
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
import passwordResetRouter from './routes/password-reset.js';
import { authMiddleware } from './middleware/auth.js';
import path from 'path';

// Init Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: sentryBeforeSend,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown',
  });
}

export async function createApp() {
  const app = express();

  // SEC-02: Trust proxy so req.ip reflects real client IP behind Railway reverse proxy
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable helmet's CSP so we can use Report-Only
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }));

  // CSP Report-Only — collects violations without enforcing
  app.use(cspReportOnlyMiddleware);

  // CSP violation report endpoint — rate limited to 10 reports/min per IP
  const cspReportLimiter = createRateLimiter(10, 60 * 1000);
  app.post('/api/csp-report', cspReportLimiter, express.json({ type: 'application/csp-report' }), cspReportHandler);

  // Support comma-separated list of origins: "http://localhost:5173,https://myapp.com"
  const rawOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173') as string;
  const origins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
  // Tunneling domains (any subdomain accepted)
  const tunnelPatterns = [/^https?:\/\/.*\.loca\.lt$/, /^https?:\/\/.*\.ngrok(-free)?\.app$/, /^https?:\/\/.*\.ngrok\.io$/];
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allow exact match from env var list
      if (origins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Allow tunneling domains (dynamic subdomains)
      if (tunnelPatterns.some(p => p.test(origin))) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
  }));
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Request ID — must be before pinoHttp so genReqId can use it
  app.use(requestIdMiddleware);

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
    genReqId: (req: Request) => req.requestId!,
    serializers: {
      req: (req: Request) => ({ method: req.method, url: req.url, query: req.query }),
      res: (res: Response) => ({ statusCode: res.statusCode }),
    },
  }));

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/auth', passwordResetRouter);  // forgot-password + reset-password
  app.use('/api/admin', adminRouter);
  app.use('/api/materials', materialsRouter);
  app.use('/api/motores', motoresRouter);
  app.use('/api/schedule', scheduleRouter);
  app.use('/api/diagnosticos', diagnosticosRouter);
  app.use('/api/curriculums', curriculumsRouter);
  app.use('/api/blocks', authMiddleware, blocksRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/prompts', promptsRouter);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Serve frontend dist (production builds — present when `npm run build` ran from root)
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    // SPA fallback — serve index.html for any non-API route
    app.get(/^\/(?!api|uploads|.*\..*).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Error handler
  app.use(errorHandler);

  return app;
}
