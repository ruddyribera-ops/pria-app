import type { Request, Response, NextFunction } from 'express';

const REPORT_URI = '/api/csp-report';

/**
 * CSP Report-Only middleware.
 * Sets Content-Security-Policy-Report-Only header instead of enforcing CSP.
 * This allows collecting violation reports before enabling full CSP enforcement.
 *
 * Note: 'unsafe-inline' and 'unsafe-eval' are included for Vite dev server compatibility.
 * For production, consider tightening with nonces.
 */
export function cspReportOnlyMiddleware(req: Request, res: Response, next: NextFunction) {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Vite dev needs unsafe-inline/eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",  // data: for inline images, https: for external
    "font-src 'self' data:",
    "connect-src 'self' https://api.minimax.io wss:",  // MiniMax API + WebSockets
    "frame-ancestors 'none'",  // Prevent clickjacking
    "base-uri 'self'",
    `report-uri ${REPORT_URI}`,
  ].join('; ');

  res.setHeader('Content-Security-Policy-Report-Only', cspDirectives);
  next();
}

/**
 * CSP violation report handler.
 * Receives reports from browsers and logs them.
 * Returns 204 No Content regardless of report validity.
 */
export function cspReportHandler(req: Request, res: Response) {
  const report = req.body?.['csp-report'];

  if (report) {
    // Log the violation with structured data for review
    console.warn('[CSP] Violation reported:', JSON.stringify(report, null, 2));
  }

  // Always return 204 - don't leak information about report handling
  res.status(204).end();
}