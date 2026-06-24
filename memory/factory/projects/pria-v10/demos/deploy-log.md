# Deploy Log — PRIA v10

## 2026-06-18 — Verify "IA no disponible" banner fix
- Type: smoke-test (no deploy)
- URL: http://localhost:5173/materiales
- Triggered by: delivery-engineer (verification request)
- Smoke test: **FAILED** — banner still appears after Síntesis click
- Screenshots:
  - D:\Temp\opencode\demo_v2\fix_01_before.png (before click — banner absent)
  - D:\Temp\opencode\demo_v2\fix_02_after_sintesis.png (after click — banner present)
  - D:\Temp\opencode\demo_v2\fix_03_fullpage.png (full page — banner present)
- Verdict: **Banner NOT fixed.** Console/body check:
  - BEFORE Síntesis: "IA no disponible" = false, "contenido simulado" = false
  - AFTER Síntesis:  "IA no disponible" = true,  "contenido simulado" = true
- Root cause: `src/components/Materials/MaterialesMotorPanel.tsx:75` renders
  `<SimulatedBanner />` when `synthesis.simulated && synthesis.result`. The Síntesis
  motor is returning `simulated: true` with a mock result, so the banner fires.
- Next: hand off to bug-fixer to investigate Síntesis hook — likely the mock fallback
  is firing before (or instead of) the real API call to the Railway backend.
