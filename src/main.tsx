// MUST BE FIRST — polyfill Buffer for docx library
import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { sentryBeforeSend } from './lib/sentry-scrubber';
import './App.css';

// Initialize Sentry only if DSN is configured (graceful degradation)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 0.1,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    sendDefaultPii: false,
    beforeSend: sentryBeforeSend,
  });
}

// Fire-and-forget health check — non-blocking, logs warning if backend is down
fetch('/api/health')
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(data => {
    if (data.db !== 'connected') {
      console.warn('[PRIA] Backend health check: DB not connected', data);
    }
  })
  .catch(() => {
    // Backend unreachable (normal in dev before backend starts) — silent catch
  });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
