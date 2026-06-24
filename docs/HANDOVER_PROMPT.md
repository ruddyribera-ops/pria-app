# PRIA v10 — Handover Prompt (Fresh Session)

**Copia y pega este documento al inicio de cualquier sesión nueva para retomar el trabajo sin pérdida de contexto.**

---

## 🎯 Project Context

**PRIA v10** = Plataforma de Recursos para la Inteligencia Académica (v10). Educational AI platform for Bolivian teachers, generating class materials (slides, plans, quizzes, synthesis) with high fidelity to source text. No fabricated content. Bolivian Spanish. Ayoreo/indigenous cultural anchoring.

**Current stage**: Sprint 1-3 complete + P0 timeout fix applied. Ready for P1 fixes, security sprint, or Railway deployment.

**Last commit**: `e2034af` (master)
**Repo**: https://github.com/ruddyribera-ops/pria-app
**Quality**: 93/100 (was 70/100 at session start)

---

## 🛠️ Working Environment

```yaml
OS: Windows 10 (PowerShell 5.1)
Working dir: D:\ACTIVE PROJECTS\PRIA v10
Disk: C:\ <20GB free (avoid installs), D:\ >199GB free (use this)
Shell: PowerShell (NOT bash — use ; not &&, use `if ($?) { ... }` for chains)
Git: GitHub auth via SSH key, repo owner = ruddyribera-ops
```

**Critical disk rule**: Never install dependencies on C:\. Use `D:\Temp\opencode\` for temp work.

---

## 🏃 Quick Start Commands

```bash
# 1. Start backend (terminal 1)
cd "D:\ACTIVE PROJECTS\PRIA v10\server"
node dist/index.js
# Listens on :3000, connects to Postgres at 127.0.0.1:5432

# 2. Start frontend (terminal 2)
cd "D:\ACTIVE PROJECTS\PRIA v10"
npm run dev
# Vite dev on :5173, allowedHosts: true

# 3. Verify both
curl http://localhost:3000/api/health
curl http://localhost:5173

# 4. Login
# URL: http://localhost:5173
# User: admin / admin123
```

**If servers don't start**: Check if they're already running (`Get-Process node`). Kill stale processes with `Stop-Process -Name node -Force` (careful — kills all Node, including unrelated).

---

## 🧱 Tech Stack

```yaml
Frontend:
  - React 19 + TypeScript + Vite 8
  - React Router 7
  - Axios (with JWT interceptor, mock-token skip)
  - CSS Modules + inline styles (Codecademy design system)

Backend:
  - Node.js + Express
  - ESM modules (use `import`, NOT `require`)
  - PostgreSQL (host: 127.0.0.1:5432, db: pria, user: postgres, no password)
  - Zod for validation

AI:
  - MiniMax M2.7 (workhorse), M3 only for brief bursts on Complex tasks
  - API: localhost proxy (NOT external call)
  - Timeout: 60s for slides, 45s for others

Build:
  - Vite 8 (allowedHosts: true for tunnels)
  - TypeScript strict mode
```

---

## 🎨 Design System (Codecademy)

```yaml
Sidebar: #1c1e24 (260px wide, green left-border for active item)
Primary: #3A9E5E (green)
Background: #ffffff
Cards: 1px solid #e6e6eb, border-radius 8px
Font: Inter (Google Fonts)
Avatar: initials in green circle
Status del Sistema: collapsible, 7 motors with colored dots
Per-materia palettes: 7 distinct palettes (Lenguaje, Sociales, etc.)
```

**Critical UX rule**: Use "Diseñar" / "Crear" / "Preparar" — NEVER "Generar" (sounds AI-generic). Never show "IA no disponible" banner.

---

## 📡 API Contract (NEVER MODIFY — Live on Railway)

```yaml
Base: https://steadfast-alignment-production.up.railway.app
Auth: JWT Bearer token
Login: POST /api/auth/login
  Body: { usuario, contrasena }    # NOT { email, password }
  Mock fallback: admin / admin123
```

**Backend endpoints** (port 3000):
- POST /api/motores/:type/  → 7 motor types
- GET  /api/motores/history/ → result_json includes fidelity_score
- POST /api/auth/login → returns { data: { token, usuario, rol } }

**Motor types**: `synthesis`, `slides`, `evaluacion`, `actividades`, `fuente`, `plan_clase`, `source_narrator`

---

## 📁 Project Structure

```
D:\ACTIVE PROJECTS\PRIA v10\
├── src/                          # React frontend
│   ├── components/
│   │   ├── Materials/MotorButton.tsx     # Polished v2 (phased progress)
│   │   ├── Motores/
│   │   │   ├── InlineSlideEditor.tsx     # Real-time fidelity + bulk fix
│   │   │   ├── MotorSection_Slides.tsx   # Slides display + badges
│   │   │   └── ...
│   │   └── Materials/MaterialesMotorPanel.tsx
│   ├── pages/DashboardPage.tsx           # "Mis Clases" with stats
│   ├── lib/
│   │   ├── fidelity/client-validator.ts  # Real-time fidelity check
│   │   ├── pptx/slides/design-system.ts  # 7 palettes + 5 templates
│   │   └── api/client.ts                 # Axios + JWT interceptor
│   └── server/                           # MIGRATED from server/ to src/server/ (incomplete)
├── server/                        # Backend (currently main)
│   ├── src/
│   │   ├── routes/motores.ts             # 7 motor endpoints (with timeout fix)
│   │   ├── lib/source-grounding.ts       # Backend fidelity validator
│   │   ├── motores/prompts/*.md          # 7 motor prompts
│   │   ├── motores/schemas/*.schema.ts   # Zod schemas per motor
│   │   ├── db/migrations/                # SQL migrations
│   │   └── app.ts                        # Express app + CORS + static dist
│   └── dist/                             # Compiled (run from here)
├── docs/
│   ├── SPRINT_STATUS.md                  # Sprint snapshot (NEW)
│   ├── expert-review-report.md           # 21 issues cataloged
│   ├── deployment-guide.md               # 4 deployment options
│   ├── sprint-2-image-workflow.md        # Teacher image workflow
│   └── factory-ops-stalling-report.md    # Earlier incident post-mortem
└── D:\Temp\opencode\             # Temp work (pre-approved)
    ├── PRIA_Sociales_v3.pptx             # Demo deck
    ├── PRIA_BulkExport_U2_T1.pptx        # Bulk export validation
    ├── server_err.log                    # Backend error log
    ├── server_out.log                    # Backend output log
    ├── pria-tunnel/                      # localtunnel package
    └── deploy-railway.ps1                # Deploy script
```

---

## ✅ Done in Recent Session

1. **P0 timeout fix** — AbortController with 60s/45s timeouts in `server/src/routes/motores.ts`
2. **ESM `require` fix** — replaced `require('fs')` with `import * as fs from 'fs'`
3. **Sprint 1-3** — FUENTE_DURA, fidelity validator, visual design v2, polished MotorButton v2, Dashboard "Mis Clases", InlineSlideEditor with bulk fix, prompt_imagen_variations, teacher guide, bulk export
4. **Self-validation** — 81 motor results in DB, 100% fidelity on source-grounded outputs
5. **Force-pushed to master** — commits fc1f5cf, 35997a8, c07cb32, 191eee1, e2034af
6. **Expert review** — `expert-tester` ran live tests, found 21 issues (P0/P1/P2/P3)
7. **Sprint status doc** — `docs/SPRINT_STATUS.md`

---

## ⚠️ Pending Decisions (next session)

### P1 Issues (8 items, 2-3 hours total)

| Issue | File | Effort |
|-------|------|--------|
| Score formula over-punishes `100 - (flags * 15)` | `source-grounding.ts` | S |
| Mock token race condition in client.ts | `client.ts` | M |
| localStorage overflow check missing | `InlineSlideEditor.tsx` | S |
| No AbortController on frontend motor calls | `useMotorGenerator.ts` | S |
| Rate limiter cost issue | `rateLimiter.ts` | M |
| Rate limiter missing Retry-After header | `rateLimiter.ts` | S |
| 2 more from static review | various | varies |

### P2/P3 Issues
- 12 medium, 7 low priority issues
- See `docs/expert-review-report.md` for full list

### Deployment (BLOCKED on user)
- Railway project created: `pria-v10-demo` (id `8fab189f-a339-4f28-b198-26b24294d46e`)
- Workspace: `3e89d797-dd5c-4510-b929-c64850a50455`
- CLI auth expires between commands (needs fresh `railway login` in user's terminal)
- Localtunnel alternative works but is fragile

### Security
- 30 Dependabot vulns (3 critical, 11 high)
- Sprint recommended before public deploy

---

## 🎯 When Resuming — Decision Tree

```
User asks something → Classify complexity:
├─ Trivial (typo, rename) → Route to @code-builder, minimal checks
├─ Simple (1-3 files) → Standard routing
├─ Moderate (4-6) → POA + parallel dispatch
└─ Complex (7-10) → DAG mandatory

Then:
├─ "Fix P1 issues" → @code-builder for each, verify with curl
├─ "Security sprint" → @code-builder updates deps, run npm audit fix
├─ "Deploy" → Guide user through `railway login` in their terminal
├─ "Demo data" → Generate full Unit 1 (with 60s delays between calls)
└─ "Continue improvements" → Pick next item from SPRINT_STATUS.md
```

---

## 🔑 Critical Rules (DO NOT VIOLATE)

### API Contract
- **NEVER modify backend API contract** — it's live on Railway
- **Mock fallback REQUIRED** for every API call (60s timeout → fall back)
- **Login sends `{ usuario, contrasena }`** — NOT `{ email, password }`
- **401 interceptor skips mock tokens** (prefix "mock-") to prevent redirect loops

### Code Style
- **ESM only** — use `import`, never `require`
- **TypeScript strict** — no `any`, no `@ts-ignore`, no `: any` (use proper types)
- **Inline styles + CSS Modules** — no Tailwind, no styled-components
- **Bolivian Spanish** — user-facing copy in Spanish, technical terms in English

### UX Patterns
- **"Diseñar" / "Crear" / "Preparar"** — never "Generar" (AI-generic)
- **No "IA no disponible" banner** — silently fall back to mock
- **Sidebar primary nav: "Mis Clases"** — not "Materiales"
- **Estado del Sistema**: collapsible, 7 motors with colored status dots

### Deployment
- **Never install on C:\** — use D:\Temp\opencode\
- **Manual migrations**: copy `server/src/db/migrations/*.sql` to `server/dist/db/migrations/`
- **Manual prompts**: copy `server/src/motores/prompts/*.md` to `server/dist/motores/prompts/*.md` after changes
- **Rate limit**: 60-90s between MiniMax calls

### Testing
- **No "fixed" without runtime proof** — curl endpoints, check status codes
- **Edge cases required** — every fix must include "Also verify: [edge case] → [expected]"
- **Tier 1 minimum**: file creation = tier 0 = REJECT, curl 200 = tier 1 = PASS

---

## 🧠 Lessons Learned (apply these)

1. **Timeouts are critical** — Slow APIs block the entire motor pipeline. Always wrap fetches in AbortController.
2. **Mock fallbacks save UX** — When MiniMax hangs, fall back to mock silently. User never sees "IA no disponible".
3. **Source grounding prevents fabrication** — 40% fabrication rate → 0% with FUENTE_DURA + validator.
4. **Per-materia palettes matter** — Generic design = generic AI. Specific colors = professional.
5. **Spanish-first UX is non-negotiable** — User refused "Generar" because it sounds AI-generic.
6. **CLI tools need interactive auth** — Railway CLI auth expires between commands. Plan for this.
7. **Disk C:\ is full** — Always check disk space before installs. Use D:\Temp.
8. **PowerShell ≠ bash** — Use `;` not `&&`, use `if ($?) { ... }` for chains.

---

## 📞 Key External Resources

```yaml
GitHub: https://github.com/ruddyribera-ops/pria-app
Railway project: pria-v10-demo (8fab189f-a339-4f28-b198-26b24294d46e)
Railway workspace: 3e89d797-dd5c-4510-b929-c64850a50455
Localtunnel: installed at D:\Temp\opencode\pria-tunnel\
Dependabot: 30 vulns (3 critical, 11 high, 14 moderate, 5 low)
```

---

## 🆘 If Stuck — Debug Order

1. **Check server logs**: `D:\Temp\opencode\server_err.log` and `server_out.log`
2. **Verify servers running**: `curl http://localhost:3000/api/health` and `curl http://localhost:5173`
3. **Check DB connection**: `psql -h 127.0.0.1 -U postgres -d pria`
4. **Check migrations copied**: `ls server/dist/db/migrations/`
5. **Check prompts copied**: `ls server/dist/motores/prompts/`
6. **Test login**: `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"usuario":"admin","contrasena":"admin123"}'`
7. **Test motor**: See SPRINT_STATUS.md for test commands

---

## 💬 Suggested First Message for Next Session

Copy this at the start of the next session:

```
Resuming PRIA v10. Last commit: e2034af. Sprint 1-3 + P0 timeout fix done.

Read D:\ACTIVE PROJECTS\PRIA v10\docs\SPRINT_STATUS.md first.
Then start servers (commands in SPRINT_STATUS.md).

Current decision: [FILL IN — P1 fixes / Security sprint / Railway deploy / Demo data / Continue improvements]
```

---

*This document is auto-generated. Update at end of each session.*