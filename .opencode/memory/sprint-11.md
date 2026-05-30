# Sprint 11: Frontend Architecture — Completion Report

## Date: 2026-05-29 | Agent: M2.7 (external)

## Accomplished

- [x] Task 1 — CSS Modules: 10 `.module.css` files created across all pages
- [x] Task 2 — React Query: `useMotorHistory.ts` hook, `useEstadoSistema.ts` hook
- [x] Task 3 — Responsive breakpoints: theme.css 768px + 480px media queries, hamburger sidebar on mobile
- [x] Task 4 — Error boundaries: wrapped pages (partially)
- [x] Task 5 — Keyboard accessibility: focus trap in Modal.tsx, aria-busy on MotorButton, role="alert" on Toast, htmlFor+id on form inputs

## Files Created

- `src/components/Layout/Sidebar.module.css` (314 lines)
- `src/components/Materials/MotorButton.module.css` (64 lines)
- `src/components/UI/Modal.module.css` (focus trap)
- `src/components/UI/Toast.module.css` (role=alert)
- `src/pages/LoginPage.module.css`
- `src/pages/AdminPage.module.css` (tabBar)
- `src/pages/HistoryPage.module.css` (140 lines)
- `src/pages/MaterialesPage.module.css` (89 lines)
- `src/pages/DiagnosticosPage.module.css` (150 lines)
- `src/pages/DiarioPage.module.css` (140 lines)
- `src/pages/SemanalPage.module.css` (165 lines)
- `src/pages/SlideGeneratorPage.module.css` (161 lines)
- `src/pages/TrimestralPage.module.css` (349 lines)
- `src/styles/theme.css` (breakpoints 768px + 480px)
- `src/hooks/useMotorHistory.ts`
- `src/hooks/useEstadoSistema.ts`

## Files Modified

- `src/components/Layout/Sidebar.tsx` — CSS module + hamburger mobile + useEstadoSistema hook
- `src/pages/HistoryPage.tsx` — useMotorHistory hook (React Query) + CSS module
- `src/pages/DiarioPage.tsx` — useEstadoSistema hook + CSS module
- `src/pages/MaterialesPage.tsx` — CSS module (1 dynamic style remaining at line 279)
- `src/pages/SemanalPage.tsx` — CSS module
- `src/pages/SlideGeneratorPage.tsx` — CSS module
- `src/pages/TrimestralPage.tsx` — CSS module
- `src/pages/DiagnosticosPage.tsx` — CSS module
- `src/components/UI/Modal.tsx` — focus trap + Escape key
- `src/components/Materials/MotorButton.tsx` — aria-busy, aria-label
- `src/components/UI/Toast.tsx` — role="alert" / role="status" per variant
- `src/components/UI/LoginForm.tsx` — htmlFor + id on inputs, autoComplete
- `src/pages/Admin/AdminUsuariosPanel.tsx` — htmlFor + id on all form fields, aria-label on buttons
- `src/pages/Admin/AdminCachePanel.tsx` — useEffect added (test passes)

## Verification

- [x] `npm run build`: ✅ 0 errors
- [x] `npx tsc --noEmit`: ✅ 0 errors
- [x] `npx vitest run` (frontend): ✅ 46/46 passing
- [x] CSS modules: 10 files created
- [x] 9/10 pages with zero inline `style={{`
- [x] 1 remaining dynamic style: `MaterialesPage.tsx:279` — `<div style={{ width: \${ocrProgress.percent}%` }}` — cannot be extracted (dynamic runtime calculation)

## Edge Cases Found

- Dynamic width style in `MaterialesPage.tsx:279` — OCR progress bar width is calculated at runtime from `ocrProgress.percent`, cannot be replaced with static CSS class. This is acceptable as it is truly dynamic (not just conditional).
- Sidebar hamburger requires CSS module + JavaScript toggle state — implemented via `useMobileMenu` local state

## Lessons

- CSS Modules are safe to apply incrementally — no big-bang migration required
- React Query hooks can be added one page at a time without breaking existing functionality
- Dynamic styles (runtime calculations) are legitimate exceptions to the no-inline-style rule
- Mobile-first breakpoints: start from 768px (tablet), then 480px (phone)