#!/usr/bin/env node
/**
 * PRIA v10 Smoke Test (Node.js)
 *
 * Usage:
 *   node scripts/smoke-test.js <baseUrl>
 *   node scripts/smoke-test.js http://localhost:3000
 *   npm run smoke  # uses SMOKE_BASE_URL env or defaults to localhost:3000
 *
 * Exit codes:
 *   0 = all tests passed
 *   1 = one or more tests failed
 */

const BASE_URL = process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const TIMEOUT_MS = 10_000;

let passed = 0;
let failed = 0;
let skipped = 0;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function colorize(text, color) {
  return process.stdout.isTTY ? `${color}${text}${RESET}` : text;
}

async function testEndpoint({ name, method = 'GET', path, body = null, expectedStatus, validate, skipIf }) {
  if (typeof skipIf === 'function' && skipIf(BASE_URL)) {
    console.log(colorize(`  → ${name} SKIPPED`, YELLOW));
    skipped++;
    return;
  }

  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  };
  if (body) options.body = JSON.stringify(body);

  process.stdout.write(`  → ${name} (${method} ${path}) ... `);

  try {
    const response = await fetch(url, options);
    const status = response.status;
    const text = await response.text();
    let json = null;
    if (text) {
      try { json = JSON.parse(text); } catch { /* not JSON, that's fine */ }
    }

    // For 204, no body expected
    if (expectedStatus === 204) {
      if (status === 204) {
        console.log(colorize(`PASS (204)`, GREEN));
        passed++;
      } else {
        console.log(colorize(`FAIL (expected 204, got ${status})`, RED));
        failed++;
      }
      return;
    }

    // Check status code (or list of acceptable codes)
    const acceptableStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!acceptableStatuses.includes(status)) {
      console.log(colorize(`FAIL (expected ${acceptableStatuses.join('/')}, got ${status})`, RED));
      if (text) console.log(`    Body: ${text.slice(0, 200)}`);
      failed++;
      return;
    }

    // If validator provided, run it
    if (validate) {
      if (validate(json)) {
        console.log(colorize(`PASS (${status})`, GREEN));
        passed++;
      } else {
        console.log(colorize(`FAIL (status ${status} but validation failed)`, RED));
        if (json) console.log(`    Body: ${JSON.stringify(json).slice(0, 200)}`);
        failed++;
      }
    } else {
      console.log(colorize(`PASS (${status})`, GREEN));
      passed++;
    }
  } catch (err) {
    const message = err.name === 'TimeoutError'
      ? `timeout after ${TIMEOUT_MS}ms`
      : err.message;
    console.log(colorize(`FAIL (${message})`, RED));
    failed++;
  }
}

async function main() {
  console.log(colorize(`\n=== PRIA v10 Smoke Test (Node.js) ===`, CYAN));
  console.log(`Target: ${BASE_URL}\n`);

  const isDev = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');

  await testEndpoint({
    name: 'Health check (DB connected)',
    path: '/api/health',
    expectedStatus: 200,
    validate: body => body?.status === 'ok' && body?.db === 'connected',
  });

  await testEndpoint({
    name: 'Health check response time < 2s',
    path: '/api/health',
    expectedStatus: 200,
    validate: body => body?.responseTimeMs < 2000,
  });

  await testEndpoint({
    name: 'Auth endpoint returns 401 unauthenticated',
    path: '/api/auth/me',
    expectedStatus: 401,
  });

  await testEndpoint({
    name: 'Login as default admin',
    method: 'POST',
    path: '/api/auth/login',
    body: { username: 'admin', password: 'admin123' },
    expectedStatus: 200,
    validate: body => body?.data?.token && body?.data?.user?.role === 'admin',
  });

  await testEndpoint({
    name: 'Login with wrong password',
    method: 'POST',
    path: '/api/auth/login',
    body: { username: 'admin', password: 'WRONG' },
    expectedStatus: 401,
  });

  // Forgot-password: 200 or 429 (rate-limited) are both acceptable
  await testEndpoint({
    name: 'Forgot password (200 or rate-limited 429)',
    method: 'POST',
    path: '/api/auth/forgot-password',
    body: { email: 'admin@pria.local' },
    expectedStatus: [200, 429],
    validate: body => {
      // 429 may return {"error":"Too many requests"} or no body
      // 200 typically returns {"message":"..."}
      if (!body) return true;
      return typeof body.message === 'string' || typeof body.error === 'string';
    },
  });

  await testEndpoint({
    name: 'Static index.html',
    path: '/',
    expectedStatus: 200,
    skipIf: () => isDev,
  });

  await testEndpoint({
    name: 'CSP report endpoint',
    method: 'POST',
    path: '/api/csp-report',
    body: { 'csp-report': { 'violated-directive': 'script-src', 'document-uri': 'http://example.com' } },
    expectedStatus: 204,
  });

  await testEndpoint({
    name: '404 on unknown API route',
    path: '/api/nonexistent',
    expectedStatus: 404,
  });

  console.log(colorize(`\n=== Results ===`, CYAN));
  console.log(`  ${colorize(`Passed:  ${passed}`, GREEN)}`);
  console.log(`  ${colorize(`Failed:  ${failed}`, failed > 0 ? RED : GREEN)}`);
  console.log(`  ${colorize(`Skipped: ${skipped}`, YELLOW)}`);

  if (failed > 0) {
    console.log(colorize(`\n❌ Smoke test FAILED. Do not deploy.`, RED));
    process.exit(1);
  }

  console.log(colorize(`\n✅ All smoke tests passed.`, GREEN));
  process.exit(0);
}

main().catch(err => {
  console.error(colorize(`\n❌ Smoke test crashed: ${err.message}`, RED));
  console.error(err.stack);
  process.exit(1);
});
