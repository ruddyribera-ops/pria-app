# Sprint 3: Prompt Architecture — Kill Duplication — Completion Report
## Date: 2026-05-27 | Agent: M2.7

## Accomplished
- [x] Task 3a: Removed 12 dead ?raw prompt imports + PROMPT_BY_TYPE table from promptRunner.ts
- [x] Task 3b: Moved executePromptStreaming to promptRunner.ts; deleted streaming.ts; updated useMotorGenerator imports
- [x] Task 3c: Added MOTOR_TEMPS table in motores.ts with all 12 motors
- [x] Task 3d: Removed MINIMAX_TEMPERATURE + MINIMAX_MAX_TOKENS from config.ts
- [x] Task 3e: Removed duplicate try/catch in FULL_AI block of executePrompt

## Files Modified
- `src/lib/pptx/promptRunner.ts` — Removed dead imports/table; executePromptStreaming added; duplicate try/catch removed
- `src/lib/pptx/streaming.ts` — DELETED
- `src/hooks/useMotorGenerator.ts` — import updated to pull executePromptStreaming from promptRunner.ts
- `server/src/routes/motores.ts` — MOTOR_TEMPS table added
- `server/src/config.ts` — MINIMAX_TEMPERATURE + MINIMAX_MAX_TOKENS removed

## Verification
- [x] promptRunner.ts has zero ?raw imports ✅
- [x] streaming.ts deleted (Test-Path returns false) ✅
- [x] useMotorGenerator.ts imports executePromptStreaming from promptRunner ✅
- [x] npm run build → 0 errors ✅
- [x] npm run typecheck → 0 errors ✅
- [x] 26/27 tests pass (1 pre-existing encoding failure on Windows `Sí` char) ✅
- [x] MOTOR_TEMPS has all 12 motors ✅

## Edge Cases Found
- The `accumulated` destructured in FULL_AI block was unused (prompt runner now passes motorType to backend which ignores accumulated) — prefixed with `_accumulated` to suppress TS error
- Windows encoding issue: `Sí` renders as `SÃ­` in vitest output. Pre-existing issue in substituteVariables test, not related to Sprint 3 changes

## Lessons
- PowerShell Get-Content | Select-Object -First N is fragile for large file truncation — direct file writes are more reliable
- Test failures in encoding-sensitive functions should use ASCII fallbacks to avoid locale issues
