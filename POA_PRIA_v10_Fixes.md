# POA — PRIA v10 Critical Fixes
**Generated:** 2026-05-31
**Project:** `D:\ACTIVE PROJECTS\PRIA v10`
**Status:** READY TO START

---

## AUDIT SUMMARY

Full codebase analysis by antagonist scanner. Found:
- **5 P0 Critical** (data loss, functional failures, deceptive UX)
- **6 P1 High** (broken UI flows, silent failures, wrong motor calls)
- **11 P2 Medium** (code smell, type safety defeated, dead code)
- **4 P3 Low** (naming, style)
- **8 Dead code items**
- **6 Edge cases missing**

---

## RESEARCH DONE (before POA)

Sources consulted:
- React.dev official docs — useContext API, Rules of Hooks, useEffect patterns
- TanStack Query v5 docs — optimistic updates, useMutation lifecycle, onError rollback
- GitHub: facebook/react #24429, #24144, #25880 — StrictMode double-invocation, hooks rules enforcement
- TanStack Query discussions #6005, #6134 — initialData undefined, suspense edge cases

Key findings from research:
1. `useAuth()` hook MUST be called unconditionally at top level — `(window as any).__useAuth` violates Rules of Hooks
2. Dead API call in `useMultiPhaseGeneration` produces indistinguishable success/failure — must either remove or fix properly
3. `.includes('done')` on a string is valid TypeScript but logically backwards — must use `=== 'done'`
4. Optimistic updates without rollback on error = data inconsistency — must apply state only inside `try` after confirmed success
5. TanStack Query `onMutate`/`onError`/`onSuccess` is the correct pattern for optimistic UI with rollback

---

## SPRINT 1 — P0 FIXES (6 files, ~40 lines)

### ISSUE P0-1: AdminPage — Broken Auth Access
**File:** `src/pages/AdminPage.tsx:23`
**Problem:** `(window as any).__useAuth?.() || {}` — `__useAuth` doesn't exist on window. User always undefined. `teacherCode` always falls back to `'ADMIN'`. Admin panel operates as wrong user.
**Research:** Direct Rules of Hooks violation. Hook called outside React component tree via window property.
**Fix:** Replace with proper `useAuth()` hook call at top level.

```tsx
// BEFORE (WRONG):
const { user } = (window as any).__useAuth?.() || {};

// AFTER (CORRECT):
const { user } = useAuth(); // useAuth already imported in file
```

**Verification:** `npm run type-check` — no hook errors. Runtime: admin panel sees real logged-in user.

**Risk:** Low. One-line fix. `useAuth` is already imported in the file.

---

### ISSUE P0-2: SemanalPage — Phase Status Check Wrong Method
**File:** `src/pages/SemanalPage.tsx:272`
**Problem:** `mpg.phaseStatuses[mpg.currentPhase]?.includes('done')` — calling `.includes()` on a string (PhaseStatus value) instead of comparing with `===`. Logic works coincidentally backwards.
**Research:** TypeScript's `string.includes()` is valid on string literals. `'done'.includes('done')` → `true`. The condition `!mpg.phaseStatuses[mpg.currentPhase]?.includes('done')` evaluates to `false` when phase IS done — hiding the result panel when it should show it.
**Fix:**

```tsx
// BEFORE (WRONG):
{!mpg.phaseStatuses[mpg.currentPhase]?.includes('done') && currentPhaseDef && (

// AFTER (CORRECT):
{mpg.phaseStatuses[mpg.currentPhase] !== 'done' && currentPhaseDef && (
```

**Verification:** Runtime test: trigger multi-phase flow, verify result panel shows after phase completion. The `!includes('done')` pattern also appears in `TrimestralPage.tsx` — check there too with `grep -n "includes('done')" src/pages/`.

**Risk:** Low. Single comparison operator fix.

---

### ISSUE P0-3: AdminUsuariosPanel — Optimistic Updates on Failed Operations
**Files:** `src/pages/AdminUsuariosPanel.tsx:58,67`
**Problem:** `setUsers()` optimistic updates run inside `catch` blocks — state changes even when API throws. Success toast shown on failure.
**Research:** Optimistic UI pattern requires: (1) apply optimistically, (2) confirm on success, (3) ROLLBACK on error. Current code does step 1 always, never does 3.
**Fix:** Move `setUsers()` inside `try` block after confirmed success. `catch` blocks should only show error toasts and NOT modify state.

```tsx
// BEFORE (WRONG):
} catch {
  setUsers(prev => prev.map(u => u.id === userId ? { ...u } : u)); // runs even on API failure
  showToast('Usuario actualizado correctamente.', 'success'); // lies on failure
}

// AFTER (CORRECT):
try {
  await updateUser({ id, ...formData });
  setUsers(prev => prev.map(u => u.id === id ? { ...u, ...formData } : u));
  showToast('Usuario actualizado correctamente.', 'success');
} catch (error) {
  showToast('Error al actualizar el usuario.', 'error');
  // Do NOT modify state — rollback to server truth
}
```

Also fix `handleDelete` (line 58): move `setUsers(prev => ...)` inside `try` after success confirmation.

**Verification:** Network tab simulation — break the API call, verify no stale state remains, verify error toast appears.

**Risk:** Medium. 3 functions need restructure. Ensure no duplicate state updates.

---

### ISSUE P0-4: AdminResetPanel — Fake Success Message on Error
**File:** `src/pages/AdminResetPanel.tsx:17-18`
**Problem:** `catch` block sets `'✅ Datos del día reiniciados correctamente. (mock)'` — success message shown when operation failed.
**Research:** Deceptive UX — user believes reset happened when it didn't.
**Fix:**

```tsx
// BEFORE (WRONG):
} catch {
  setMessage('✅ Datos del día reiniciados correctamente. (mock)');
}

// AFTER (CORRECT):
} catch (error) {
  setMessage('❌ Error al reiniciar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
}
```

**Verification:** Break the API, verify error message appears (not success).

**Risk:** Low. One line per catch block.

---

### ISSUE P0-5: useMultiPhaseGeneration — Server API Never Called (Requires Backend Verification FIRST)
**File:** `src/hooks/useMultiPhaseGeneration.ts:106-108`
**Problem:** `await apiFn(payload)` discards the response, errors silently swallowed, always falls through to local `executePrompt`. Server AI never actually receives multi-phase requests.
**Research:** Fire-and-forget with silent fallback — API success and failure produce identical outcomes. The catch block enables the fallback, not handles the error.

**CRITICAL: BEFORE FIXING, verify backend behavior.**

The key question: Does the backend `/api/motores/{motorType}/submit-phase` endpoint do anything different from `promptRunner.executePrompt()`?

**Option A (Remove dead code — if backend is redundant):**
```tsx
// DELETE the dead API call block entirely
// Keep only the local promptRunner
const result = await executePrompt(motorType, phaseId, currentResults, params);
```

**Option B (Fix properly — if backend is needed):**
```tsx
try {
  const apiResult = await submitPhaseToServer(motorType, phaseId, currentResults, params);
  setPhaseResult(phaseId, apiResult);
  return; // skip local fallback
} catch (error) {
  console.warn('Server generation failed, using local mock:', error);
  // fall through to local
}
const result = await executePrompt(motorType, phaseId, currentResults, params);
setPhaseResult(phaseId, result);
```

**Backend Verification Steps:**
1. Check `src/api/motores.ts` for `motorSubmitPhase` or similar endpoint
2. Check backend server routes for `/api/motores/*/submit-phase`
3. If endpoint exists and has unique logic (rate limiting, state persistence, different AI model) → Option B
4. If endpoint just proxies to MiniMax same as `promptRunner` → Option A (remove dead code)

**Verification:** Network tab — multi-phase should show backend calls (Option B) or confirm they're absent (Option A, after removal).

**Risk:** Medium. Depends on backend verification result.

---

### ISSUE P0-6: MaterialesPage — Synthesis Calls Wrong Motor
**File:** `src/pages/MaterialesPage.tsx:314-316`
**Problem:** `MotorSection_Synthesis`'s `onGenerate` calls `abp.generate()` instead of `synthesis.generate()`. Synthesis result never produced.
**Fix:**

```tsx
// BEFORE (WRONG):
<MotorSection_Synthesis
  onGenerate={() => {
    abp.generate({...}); // ← wrong motor
  }}

/>
// AFTER (CORRECT):
<MotorSection_Synthesis
  onGenerate={() => {
    synthesis.generate({...});
  }}
/>
```

Also verify `synthesis` state is properly initialized in `MaterialesPage` (check the `const { synthesis } = useMotorGenerator('synthesis')` call).

**Verification:** Run synthesis generation, verify output is synthesis content (not ABP content).

**Risk:** Low. Function name fix.

---

## SPRINT 2 — P1 FIXES (6 issues, parallelizable)

### P1-1: Toast Race Condition
**File:** `src/components/UI/Toast.tsx:18-24`
**Problem:** Module-level `let toastId = 0; ++toastId` — can collide in React StrictMode or concurrent renders.
**Fix:** Use React 18's `useId()` hook:
```tsx
const id = useId(); // unique per render, safe in concurrent mode
```
Add to ToastProvider and Toast component.

### P1-2: Empty Teachers Arrays
**Files:** `src/pages/DiarioPage.tsx:59`, `src/pages/SemanalPage.tsx:61`
**Problem:** `teachers` and `weekData` declared but never populated.
**Fix:** Load from `/api/teachers` endpoint or remove if not needed. Determine if these are planned but unimplemented features.

### P1-3: Silent Polling Errors
**File:** `src/hooks/useMotorGeneration.ts:79-81`
**Problem:** `pollEstado` catch block swallows network errors silently.
**Fix:** Log errors or update health status:
```tsx
} catch (error) {
  console.warn('Health check polling failed:', error);
  // Optionally update health status to 'degraded'
}
```

### P1-4: Sidebar Health Indicator Always Green
**File:** `src/components/Layout/Sidebar.tsx:256-258`
**Problem:** Hardcoded green emoji regardless of `health.status`.
**Fix:** Add conditional rendering:
```tsx
<span>{health.status === 'healthy' ? '🟢' : health.status === 'degraded' ? '🟡' : '🔴'}</span>
```

### P1-5: Dead Variable `isDone`
**File:** `src/pages/SlideGeneratorPage.tsx:26`
**Problem:** `const isDone = phaseStatus === 'done'` declared but never used.
**Fix:** Remove or use it in the template.

### P1-6: Mock Output Encoding Corruption
**File:** `src/lib/pptx/promptRunner.ts` — mock generators
**Problem:** UTF-8 bytes interpreted as Latin-1 — strings like `'â€"', 'Ã©', 'Ã¡'` instead of accented Spanish.
**Fix:** Re-encode all mock strings with correct characters. e.g., `'â€"'` → `'"'`, `'Ã©'` → `'é'`, `'Ã¡'` → `'á'`.

---

## SPRINT 3 — DEAD CODE CLEANUP (8 items)

| # | File | Item | Action |
|---|------|------|--------|
| D1 | `src/styles/theme.css` | Entire file | Delete — not imported anywhere |
| D2 | `src/components/Materials/MotorResultSkeleton.tsx` | Entire file | Delete — not imported anywhere |
| D3 | `src/lib/pptx/promptRunner.ts:43-50` | Dead comment block about `loadPromptFile` | Delete comment block |
| D4 | `src/lib/pptx/promptRunner.ts` | `MOTOR_PHASE_MAP` constant (exported but unused) | Delete export and constant |
| D5 | `src/pages/SemanalPage.tsx:61` | `weekData` empty constant | Delete if not planned |
| D6 | `src/pages/SlideGeneratorPage.tsx:26` | `isDone` unused variable | Delete |
| D7 | `src/hooks/useMotorGeneration.ts` | `pollingRef`, `stopPolling`, `pollEstado` (never called) | Delete if confirmed unused |
| D8 | `src/App.css:2-3` | Outdated version comment `PRIA v5.4` | Update to `PRIA v10` |

---

## SPRINT 4 — TYPE SAFETY FIXES

### Fix `as any` Casts (8 instances)

| File | Line | Fix |
|------|------|-----|
| `src/pages/SemanalPage.tsx` | 102 | Replace `as any` with proper typed `mergePhaseResults` return |
| `src/pages/TrimestralPage.tsx` | 298 | Type `mergedData` properly |
| `src/pages/SlideGeneratorPage.tsx` | 222 | Type `mergedData` properly |
| `src/pages/MaterialesPage.tsx` | 304 | Type callback properly |
| `src/api/admin.ts` | 23 | Return type `Promise<AdminUser[]>` instead of `any[]` |
| `src/api/admin.ts` | 28 | Return type `Promise<AdminUser>` instead of `any` |
| `src/pages/AdminPage.tsx` | 23 | Remove `(window as any)` — fix P0-1 |
| `src/components/Motores/MotorButtonRow.tsx` | 4 | Type `curriculumPreview` as `CurriculumPreview \| undefined` |

---

## EDGE CASES TO HANDLE

1. **No network timeout on motor generation** — `useMotorGenerator.generate()` has no timeout. Add AbortController with timeout:
```tsx
const timeoutId = setTimeout(() => controller.abort(), 60000);
try {
  const result = await executePrompt(..., { signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

2. **No retry with backoff** — single attempt, no retry. Consider adding exponential backoff retry (3 attempts).

3. **Division by zero in ProgressBar** — `src/components/UI/ProgressBar.tsx:8`. Add guard:
```tsx
const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
```

4. **Empty `curriculumPreview` in export filename** — `MaterialesPage.tsx:145`. Add fallback:
```tsx
const filename = curriculumPreview 
  ? `PRIA_${curriculumPreview.unidad_real || 'material'}.pptx` 
  : 'PRIA_material.pptx';
```

5. **Empty phases in `mergePhaseResults`** — if motor has no phases, returns defaults. Document this behavior or add warning.

6. **SSE stream without `done` event** — `minimaxClient.ts:289` returns error. Handle gracefully with user-facing message.

---

## VERIFICATION COMMANDS

Run after each fix:

```bash
# TypeScript check (all P0 fixes must pass)
cd "D:\ACTIVE PROJECTS\PRIA v10"
npm run type-check

# Lint
npm run lint

# Build (must succeed before any deploy)
npm run build

# E2E tests (if available)
npm run test:e2e

# Manual verification checklist:
# P0-1: Login as admin, open AdminPage, verify teacherCode matches logged-in user
# P0-2: Trigger multi-phase in SemanalPage, verify result panel shows after phase completion
# P0-3: Break updateUser API, verify error toast and no stale state
# P0-4: Break reset API, verify error message (not success)
# P0-5: Network tab — confirm server calls happen (or confirm they're gone after removal)
# P0-6: Run synthesis generation, verify output is synthesis content
```

---

## FILES SUMMARY

```
Modified:  src/pages/AdminPage.tsx          (P0-1)
Modified:  src/pages/SemanalPage.tsx         (P0-2)
Modified:  src/pages/AdminUsuariosPanel.tsx  (P0-3)
Modified:  src/pages/AdminResetPanel.tsx     (P0-4)
Modified:  src/hooks/useMultiPhaseGeneration.ts (P0-5, depends on backend verification)
Modified:  src/pages/MaterialesPage.tsx       (P0-6)

Deleted:   src/styles/theme.css              (D1)
Deleted:   src/components/Materials/MotorResultSkeleton.tsx (D2)

Modified:  src/components/UI/Toast.tsx        (P1-1)
Modified:  src/pages/DiarioPage.tsx           (P1-2)
Modified:  src/pages/SemanalPage.tsx          (P1-2, P1-5)
Modified:  src/hooks/useMotorGeneration.ts     (P1-3, D7)
Modified:  src/components/Layout/Sidebar.tsx   (P1-4)
Modified:  src/pages/SlideGeneratorPage.tsx   (P1-5)
Modified:  src/lib/pptx/promptRunner.ts       (P1-6, D3, D4)
Modified:  src/App.css                        (D8)
```

**Total: 6 P0 files, 8 P1/P2 files, 2 deleted files.**

---

## BEFORE STARTING SPRINT 1

1. **VERIFY BACKEND** — Check if `/api/motores/{motorType}/submit-phase` exists and what it does. This determines P0-5 approach.
2. **GIT STATUS** — Confirm clean working tree before starting.
3. **BACKUP** — `git branch backup-sprint1` or equivalent snapshot.

---

## HOW TO RESUME AFTER COMPACTION

If context is compacted mid-sprint:
1. Read this file: `D:\ACTIVE PROJECTS\PRIA v10\POA_PRIA_v10_Fixes.md`
2. Run `git status` to see what's been done
3. Continue from next uncompleted issue
4. Re-run verification commands after each fix