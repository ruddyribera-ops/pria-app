# POST-MORTEM: PRIA v10 Demo Preparation

**Date:** June 18, 2026
**Project:** PRIA v10 — AI Educational Platform
**Session duration:** ~4 hours (should have been ~45 minutes)
**Author:** Account Manager + tech-writer

---

## Executive Summary

- **What was fixed:** 12 files modified to fix axios stream bug, missing `filepath` column, absent Síntesis button, locked Plan/Quiz/Slides/Ficha buttons, incorrect "IA no disponible" banner, and Sentry type error.
- **Current status:** Demo functional for angel investor presentation.
- **Main failure:** Same bug (`simulated: true` hardcoded) existed in 5 files, fixed one at a time instead of searching globally first.
- **Real cost:** ~4 hours when it should have been ~45 minutes with the right process.
- **Net result:** It works, but the time cost and repetition was unnecessary.

---

## Timeline

| Time | What was tried | Result |
|------|----------------|--------|
| 0:00 | Session starts with 7 reported issues | Clear list of problems |
| 0:05 | Dispatched bug-fixer to investigate axios stream | Returned extensive analysis instead of fix |
| 0:15 | Server crashed during verification | Task cancelled, re-dispatched |
| 0:25 | Fixed `motores.ts` (fetch instead of axios stream) | ✅ Worked |
| 0:30 | 500 error on `/api/materials` — `filepath` column missing | Migration never ran |
| 0:35 | Dispatched to fix migration | Deep analysis before simple fix |
| 0:45 | Added `filepath` column manually | ✅ Worked |
| 1:00 | Síntesis button doesn't appear | Curriculum topics missing from PDF |
| 1:10 | Dispatched multiple agents for Síntesis prompt | Prompt received Chinese characters without approval |
| 1:30 | Edited prompts multiple times | Unwanted content in example |
| 1:45 | Plan/Quiz/Slides/Ficha buttons locked | Required `curriculumPreview` |
| 2:00 | Dispatched for Motores and SemanalPage | Partial fix, not global |
| 2:15 | "IA no disponible" banner appeared with real content | `simulated: true` hardcoded |
| 2:30 | bug-fixer did 6693-byte analysis on simulated flag | Deep but inefficient |
| 2:45 | Fixed SemanalPage | ✅ Worked |
| 3:00 | Fixed SlideGeneratorPage | ✅ Worked |
| 3:15 | Fixed minimaxClient.ts | ✅ Worked |
| 3:30 | Fixed promptRunner.ts (2 places) | ✅ Worked |
| 3:45 | Fixed useMultiPhaseGeneration.ts | ✅ Worked |
| 4:00 | Sentry error (Event vs ErrorEvent) | Direct fix in sentry-scrubber.ts |
| 4:15 | Final verification | Demo functional |

---

## What Went Wrong

### The `simulated: true` bug was fixed 5 times instead of 1

When user reported that the "IA no disponible" banner appeared with real content, the correct response would have been:

```bash
grep -rn "simulated: true" src/
```

That would have found the 5 files in 1 second:
1. `SemanalPage.tsx`
2. `SlideGeneratorPage.tsx`
3. `minimaxClient.ts`
4. `promptRunner.ts` (2 locations)

Instead, an agent was dispatched that produced 6693 bytes of analysis. The analysis was correct but unnecessary. A grep would have sufficed.

### Agents were cancelled and re-dispatched

During the session, multiple tasks were cancelled because the Railway server crashed during verification. This caused:
- Lost effort on partial work
- Re-dispatch of nearly-completed tasks
- Session longer than necessary

### The account-manager touched code directly

On at least two occasions, the account-manager executed bash and edited files instead of dispatching a specialist. This violated the technical chain of command. The account-manager should coordinate, not code.

### Prompt received unapproved content

The `synthesis.md` file was edited with an example containing Chinese characters. User did not request this nor was consulted. Minor in retrospect, but shows that "show before apply" step is missing for content changes.

---

## How It Should Have Gone

### Minute 0-5: Global search first

When "IA no disponible" banner problem was reported:

```bash
grep -rn "simulated: true" src/
```

Immediate result: 5 files. Fix in parallel or one-by-one verified, but without unnecessary deep analysis.

### Minute 5-15: One fix per dispatch

Instead of dispatching an agent that analyzes the entire codebase, the correct methodology is:
1. grep to find all instances
2. dispatch ONE verified fix
3. verify it works
4. next fix

Not: "fix the banner problem" → agent does 6693 bytes of analysis → 5 files modified without incremental verification.

### Before editing prompts: approve with user

If the fix requires changing an example in a prompt, show the change before applying. The user is non-technical and doesn't expect their demo to have content they didn't request in languages they don't speak.

### Account-manager doesn't touch technical files

The account-manager coordinates, delegates, and manages expectations. If it needs to verify something technical, it dispatches to `code-explainer` or `code-analyzer` agent. If it needs a fix, it dispatches to `bug-fixer` with specific scope.

---

## Golden Rule Violations

| Rule | What happened |
|------|---------------|
| **Search before deep dive** | Extensive analysis agents dispatched when grep would suffice |
| **One fix per dispatch, verify, next** | Tried to fix everything at once, ended up in 5 separate dispatches anyway |
| **Account-manager doesn't touch code** | account-manager ran bash and edited files directly |
| **Approve content changes with user** | Prompt received Chinese characters without consultation |
| **Verify after each fix** | Multiple changes made before verifying server was still up |

---

## Next Steps to Prevent This

### Rule 1: Global grep before any bug dispatch

```
WHEN: user reports "the banner says IA no disponible when it shouldn't"
THEN: first step is `grep -rn "simulated" src/`
NOT: dispatch agent to analyze the problem
```

### Rule 2: Account-manager = coordinator, not technical executor

- Account-manager never opens files to edit them
- If needs to verify something, dispatches to `code-explainer` or `code-analyzer`
- If needs a fix, dispatches to `bug-fixer` with specific scope

### Rule 3: One fix per dispatch with verification

```
FOR EACH bug:
  1. dispatch fix with exact scope (file X, line Y)
  2. verify it works
  3. if it works, next bug
  4. if it doesn't, bug-fixer investigates
```

### Rule 4: Content changes require approval

- If a fix modifies a prompt or example, show the change before applying
- Wait for user confirmation (or account-manager if technical)

### Rule 5: Verify server before dispatch

- Before making a fix that requires backend running, verify Railway is up
- If server is down, don't dispatch until it's back

---

## Final Note

The demo works. That's what matters for Thursday's presentation. But the process cost 4x more than necessary because "analyze deeply" was prioritized over "fix quickly and verify". Next time: grep first, small dispatch, verify, repeat.

---

*Report generated: 2026-06-18*
*Files modified: 12*
*Bugs found: 7*
*Bugs fixed: 7*
*Time cost: ~4 hours (estimated: 45 minutes with correct process)*

## Lessons for Memory

1. **Always grep/glob first** — when user reports "X appears when it shouldn't" or "X doesn't work", search the codebase for ALL instances of X before dispatching analysis agents
2. **Account-manager = pure coordinator** — never edit files, never run bash for technical work, always delegate
3. **One fix per dispatch, verify, next** — incremental verification prevents wasted work
4. **Show prompt/content changes before applying** — non-technical users need to approve text changes
5. **Verify server state before dispatch** — wasted verification cycles when server is down