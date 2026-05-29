# Known Issues — PRIA v10

## Accepted Tradeoffs

These issues are known, documented, and accepted given the project's constraints (single-developer, educational tool, <50 concurrent teachers).

---

### 1. JWT in localStorage (not HttpOnly cookies)

**What:** Authentication tokens are stored in browser `localStorage` instead of `HttpOnly` cookies.

**Impact:** Vulnerable to XSS attacks. If an attacker injects malicious JavaScript, they can steal the JWT and impersonate the user.

**Why acceptable:**
- Educational tool used by a known group of teachers (low attacker motivation)
- `localStorage` is required for the current PWA offline-capable architecture
- Session duration is short (24h expiry on JWT)
- For <50 teachers in a controlled environment, this risk is acceptable

**Mitigations:**
- JWT expires in 24h
- No sensitive data exposed in the token (only user ID + role)
- Helmet CSP headers block inline script injection from external sources

---

### 2. Browser-side OCR (not server-side)

**What:** OCR is performed in the browser using Tesseract.js. Large PDFs may cause high client-side memory usage.

**Impact:** Slow on low-end devices. PDFs with >50 pages trigger PARTIAL_CONTENT warning.

**Why acceptable:**
- Reduces server infrastructure cost (no OCR server needed)
- Offline-capable (OCR works without internet after initial Tesseract worker load)
- Appropriate for the target device profile (school computers with Chrome)

**Mitigations:**
- MAX_PDF_PAGES = 50 (large PDFs show PARTIAL_CONTENT warning)
- Progress bar shows OCR status in real-time
- Worker is cached after first load

---

### 3. No true SSE streaming

**What:** Motor generation returns the full result at once. There is no Server-Sent Events streaming.

**Impact:** Users see a loading state, then the complete result. No progressive loading indicator.

**Why acceptable:**
- MiniMax API itself doesn't always stream reliably
- Current UI already handles loading state gracefully
- Adding SSE would require significant backend complexity (event source management)

**Future improvement:** Implement SSE in backend for true streaming when MiniMax streaming is stable.

---

### 4. No password policy

**What:** The registration system accepts any password without strength requirements.

**Why acceptable:**
- Admin controls user creation (no public registration)
- Admin password is auto-generated and stored securely in Railway env vars
- Educational context (trusted users only)

**Future improvement:** Add password strength indicator for manual registrations.

---

### 5. Inline CSS (partial migration in Sprint 6)

**What:** Most components use inline `style={{}}` objects instead of CSS classes.

**Impact:** Larger bundle size, harder to maintain, no CSS custom properties enforcement.

**Why acceptable:**
- Works reliably across all browsers
- Components are self-contained (no external CSS dependencies)
- Sprint 6 created CSS variables in App.css as proof-of-concept

**Future improvement:** Migrate key components (Sidebar, MotorButton, MaterialesPage) to CSS classes using `--pria-*` variables.

---

### 6. Test encoding issue on Windows

**What:** `substituteVariables` test fails on Windows due to UTF-8 `Sí` character rendering as `SÃ­` in vitest output.

**Impact:** 1 test always fails on Windows, but the code itself works correctly.

**Root cause:** Windows console encoding issue with UTF-8 characters in test assertions.

**Status:** Pre-existing. Not blocking. Will be fixed in future sprint.