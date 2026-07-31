# Bug — /materiales page crashes: result.reduce is not a function

**Filed by:** QA Engineer
**Date:** 2026-07-02
**Project:** pria-v10
**Feature:** Materiales page (post-login redirect target)
**Severity:** high

## Reproduction

1. Login at http://localhost:5173/login as m.gonzalez / docente123
2. Click "Iniciar Sesion"
3. App redirects to /materiales (the post-login landing page)
4. Page renders the error boundary: "Algo salio mal - Ocurrio un error en la pagina 'Materiales'"
5. Reproduced 2x: once on login redirect, once on direct navigation to /materiales

## Expected

/materiales renders the materials browser (list of generated motor results with download/preview affordances).

## Actual

Error boundary catches a TypeError. Console error:

```
TypeError: result.reduce is not a function
  at MotorSection_Slides (http://localhost:5173/src/components/Motores/MotorSection_Slides.tsx:19:47)
  at MaterialesMotorPanel (http://localhost:5173/src/components/Materials/MaterialesMotorPanel.tsx:40:3)
  at MaterialesPage (http://localhost:5173/src/pages/MaterialesPage.tsx:49:25)
  at ErrorBoundary ...
```

The component `<MotorSection_Slides>` calls `.reduce()` on a `result` value that is NOT an array. Root cause hypothesis: one or more motor results store `result_json` as a plain object (e.g. slides result_json is `{ quality: {...}, ... }` or an object wrapper, not a `SlideItem[]` array). The component assumes an array shape and does not guard.

## Evidence

- Screenshot: D:\Temp\opencode\materiales_crash.jpeg
- Console stack trace captured via chrome-devtools MCP (msgid=33, msgid=34)
- Crash triggers on the account that just generated 13 motors (m.gonzalez), so the materials list is non-empty and contains the slides result (id=12) whose result_json is an object, not an array.

## Workaround

Navigate manually to /dashboard after login (the dashboard renders fine and links into all other working pages: /historial, /slides, /wizard, /diario, /semanal, /trimestral, /diagnosticos). The /materiales page itself is unreachable.

## Suggested fix area

`src/components/Motores/MotorSection_Slides.tsx` line 19. Add a guard:

```ts
const slides = Array.isArray(result) ? result : (result?.slides ?? []);
// then use slides.reduce(...)
```

Also audit every `MotorSection_*` component for the same `.reduce` / `.map` assumption - the bug likely recurs for any motor whose result_json is an object rather than an array. Consider normalizing at the API boundary in `MaterialesMotorPanel.tsx` so individual sections receive a guaranteed array.

## Impact on demo

HIGH / demo-blocking. The client's first screen after login is a crash. Must fix before delivery.
