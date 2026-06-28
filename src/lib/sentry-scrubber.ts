import type * as Sentry from '@sentry/react';

const SENSITIVE_HEADER_PATTERNS = [
  /authorization/i, /cookie/i, /set-cookie/i,
  /x-api-key/i, /x-auth-token/i,
];
const SENSITIVE_FIELD_PATTERNS = [
  /password/i, /token/i, /secret/i, /api[_-]?key/i, /jwt/i,
  /bearer\s+/i, /session[_-]?id/i,
];

function scrubObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(scrubObject);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELD_PATTERNS.some(p => p.test(k))) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = scrubObject(v);
    }
  }
  return out;
}

export function sentryBeforeSend(
  event: Sentry.ErrorEvent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _hint: Sentry.EventHint,
): Sentry.ErrorEvent | null {
  if (event.request?.headers && typeof event.request.headers === 'object') {
    for (const key of Object.keys(event.request.headers)) {
      if (SENSITIVE_HEADER_PATTERNS.some(p => p.test(key))) {
        (event.request.headers as Record<string, string>)[key] = '[REDACTED]';
      }
    }
  }
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }
  if (event.extra) event.extra = scrubObject(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrubObject(event.contexts) as Sentry.ErrorEvent['contexts'];
  return event;
}