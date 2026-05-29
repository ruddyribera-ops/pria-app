# SPRINT D — Frontend Architecture

> **Source:** MASTER_PLAN_REMEDIATION.md §5 (UI/UX), §8 (Data Flow), MASTER_ROADMAP.md Sprint D
> **Status:** Not started
> **Date:** 2026-05-29
> **Branch:** master

---

## Sprint D Entry State

| Check | Status |
|-------|--------|
| Build | ✅ 0 errors |
| Typecheck | ✅ 0 errors |
| Tests | ✅ 127/127 passing |
| Sprint A (Architecture) | ✅ Verified |
| Sprint B (Code Quality) | ✅ Verified |
| Sprint C (Testing & Observability) | ✅ Verified |

---

## Task 1 — CSS Architecture (Replace Inline Styles)

**Source:** MASTER_PLAN §2.2 (P1), §5.1 (P1)
**Status:** ❌ Not started
**Complexity:** High — touches every .tsx file

### What
Every `.tsx` file in `src/` uses `style={{}}` objects. No CSS classes, no shared design tokens. Changing a color requires editing 40+ files. This is the biggest UX debt.

### Strategy: CSS Modules
CSS Modules are already supported by Vite (no new deps). Each component gets its own `.module.css` file with shared design tokens from a central theme file.

### Files to create
| File | Purpose |
|------|---------|
| `src/styles/theme.css` | CSS custom properties: colors, spacing, typography |
| `src/styles/components.css` | Shared component styles |
| `src/components/Layout/Sidebar.module.css` | Sidebar styles |
| `src/pages/LoginPage.module.css` | Login styles |
| `src/pages/MaterialesPage.module.css` | MaterialesPage styles |
| `src/pages/AdminPage.module.css` | AdminPage styles |
| `src/pages/HistoryPage.module.css` | HistoryPage styles |
| `src/pages/DiagnosticosPage.module.css` | DiagnosticosPage styles |
| `src/pages/DiarioPage.module.css` | DiarioPage styles |
| `src/pages/SemanalPage.module.css` | SemanalPage styles |
| `src/components/Materials/MotorButton.module.css` | MotorButton styles |

### theme.css pattern
```css
:root {
  /* Colors */
  --pria-dark: #1e1e2f;
  --pria-sidebar: #181825;
  --pria-text: #e6e6eb;
  --pria-text-muted: #6b6b80;
  --pria-accent: #3A9E5E;
  --pria-accent-hover: #2d7a4a;
  --pria-border: #2a2a3c;
  --pria-danger: #e53e3e;

  /* Typography */
  --font-base: 0.875rem;
  --font-sm: 0.75rem;
  --font-xs: 0.6875rem;
  --font-heading: 1rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Layout */
  --sidebar-width: 260px;
  --container-max: 1400px;
}
```

### Migration pattern for each component
```tsx
// Before
<div style={{ padding: '1rem', color: '#e6e6eb' }}>
  <button style={{ background: '#3A9E5E', color: '#fff' }}>Click</button>
</div>

// After
import styles from './Component.module.css';

<div className={styles.container}>
  <button className={styles.primaryBtn}>Click</button>
</div>
```

### Verify
```powershell
cd D:\ACTIVE PROJECTS\PRIA v10
# Verify no style={{}} in migrated files
grep -r "style={{" src/pages/ src/components/Layout/ --include="*.tsx" | wc -l
# Should decrease from ~40 to 0 over time
npm run build
```

### Edge cases
- `style={{ ...styleA, ...styleB }}` merge pattern → convert to combined class
- Dynamic styles `style={{ color: isActive ? 'green' : 'red' }}` → use CSS `:active` / `.active` class
- Responsive styles `maxWidth: '90vw'` → convert to CSS media queries

---

## Task 2 — React Query (TanStack Query)

**Source:** MASTER_PLAN §8.1 (P2)
**Status:** ❌ Not started
**Complexity:** Medium — adds caching, deduplication, retry to all API calls

### What
Replace manual `useState + useEffect` data fetching with React Query. Every page currently re-fetches everything when navigating. React Query gives caching, background refetch, and stale-while-revalidate for free.

### Install
```bash
npm install @tanstack/react-query
npm install -D @tanstack/query-devtools
```

### Setup
```tsx
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes
      gcTime: 10 * 60 * 1000,       // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

```tsx
// src/App.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

<QueryClientProvider client={queryClient}>
  <Router>...</Router>
</QueryClientProvider>
```

### Convert useMotorGeneration hook (example)
```tsx
// src/hooks/useMotorGeneration.ts → convert to useQuery + useMutation

import { useQuery, useMutation } from '@tanstack/react-query';
import { getMaterials, uploadMaterial, deleteMaterial } from '../api/materials';
import { getCurriculums } from '../api/curriculums';

// Fetch materials with caching
export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: getMaterials,
    staleTime: 5 * 60 * 1000,
  });
}

// Upload with cache invalidation
export function useUploadMaterial() {
  return useMutation({
    mutationFn: uploadMaterial,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });
}
```

### Files to convert (in order)
1. `src/api/materials.ts` → add `useQuery` hooks in `src/hooks/useMaterials.ts`
2. `src/api/curriculums.ts` → add `useQuery` hook in `src/hooks/useCurriculums.ts`
3. `src/api/diagnosticos.ts` → add `useQuery` + `useMutation`
4. `src/api/admin.ts` → add `useQuery` for estado-sistema
5. `src/pages/MaterialesPage.tsx` → consume `useMaterials()` hook instead of useState/useEffect
6. `src/pages/HistoryPage.tsx` → consume `useQuery` instead of useState/useEffect
7. `src/pages/DiagnosticosPage.tsx` → consume hook
8. `src/components/Layout/Sidebar.tsx` → consume `useEstadoSistema()` for dropdown polling

### Verify
```powershell
cd D:\ACTIVE PROJECTS\PRIA v10
npx vitest run --reporter=verbose
# All existing tests should pass (React Query doesn't change behavior, only caching)
```

### Edge cases
- React Query may cache old data after mutations → always `invalidateQueries` after POST/DELETE
- `queryClient.setQueryData` can update cache optimistically for better UX
- Error state needs to be handled explicitly (not just useState defaults)

---

## Task 3 — Responsive Breakpoints

**Source:** MASTER_PLAN §5.1 (P1)
**Status:** ❌ Not started
**Complexity:** Medium — add CSS media queries to layout and page components

### What
Mobile (768px) makes the 260px sidebar take 33% of screen. Add responsive breakpoints and collapse sidebar to hamburger menu on mobile.

### Add to theme.css
```css
@media (max-width: 768px) {
  :root {
    --sidebar-width: 0px;
  }
}

@media (max-width: 480px) {
  :root {
    --font-base: 0.8125rem;
  }
}
```

### Sidebar mobile behavior
- On mobile: sidebar collapses to off-canvas drawer
- Hamburger button in top-left corner
- Touch gesture to swipe open/close
- Overlay backdrop when drawer is open

### Components to update
| Component | Change |
|-----------|--------|
| `src/components/Layout/AppLayout.tsx` | Conditionally render sidebar |
| `src/components/Layout/Sidebar.tsx` | Add hamburger button + drawer behavior |
| `src/App.tsx` | Add responsive container wrapper |
| `src/pages/MaterialesPage.tsx` | Adjust grid layout for mobile |

### Verify
```powershell
# Manual: resize browser to 375px (mobile) and 1024px (tablet)
# Check sidebar collapses, content reflows, no horizontal scroll
```

### Edge cases
- Sidebar dropdown menus on touch → use tap instead of hover
- MaterialesPage motor buttons on mobile → stack vertically not 4-column grid
- Modal dialogs on mobile → full screen instead of centered overlay

---

## Task 4 — Error Boundaries per Feature

**Source:** MASTER_PLAN §5.4 (P2)
**Status:** ❌ Not started
**Complexity:** Low — wrap existing components with ErrorBoundary

### What
`src/components/UI/ErrorBoundary.tsx` exists but isn't used. Wrap each page section with it so a crash in one feature doesn't take down the entire app.

### Pattern
```tsx
// Wrap each page section
<div className={styles.pageSection}>
  <ErrorBoundary fallback={<MaterialsError />}>
    <MaterialesPage />
  </ErrorBoundary>
</div>

// MaterialsError fallback component
function MaterialsError() {
  return (
    <div className={styles.errorState}>
      <span>⚠️</span>
      <p>Error al cargar materiales</p>
      <button onClick={() => window.location.reload()}>Reintentar</button>
    </div>
  );
}
```

### Files to wrap
| Page/Component | Fallback |
|----------------|---------|
| `MaterialesPage` | MaterialsError |
| `HistoryPage` | HistoryError |
| `SlideGeneratorPage` | SlidesError |
| Admin panels | AdminError |

### Verify
```powershell
# DevTools: ErrorBoundary in React DevTools shows which boundary caught an error
# Or intentionally throw in a component and verify the fallback renders
```

---

## Task 5 — Keyboard Accessibility Audit

**Source:** MASTER_PLAN §5.6 (P2)
**Status:** ❌ Not started
**Complexity:** Medium — audit + fix interactive elements

### What
Audit all interactive elements for WCAG 2.1 AA compliance. Custom buttons with `style` props don't have `role`, `aria-label`, or keyboard handlers.

### Checklist items
- [ ] All `<button>` elements have accessible text or `aria-label`
- [ ] Modal has focus trap (Tab key stays within modal)
- [ ] Toast notifications have `role="alert"`
- [ ] Sidebar dropdown toggle has `aria-expanded`
- [ ] Motor buttons have `aria-busy` while loading
- [ ] All form inputs have associated `<label>` or `aria-label`
- [ ] `Escape` key closes modals
- [ ] `Enter` key activates focused buttons
- [ ] Focus is visible (no `outline: none` without focus style)

### Quick wins to fix
```tsx
// Custom button → use proper aria attributes
<button
  onClick={handleClick}
  aria-label="Cerrar modal"
  aria-expanded={isOpen}
  disabled={isLoading}
  aria-busy={isLoading}
>
  {label}
</button>

// Modal focus trap
useEffect(() => {
  if (isOpen) {
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();
  }
}, [isOpen]);
```

### Verify
```powershell
# Use browser accessibility panel (F12 → Accessibility tab)
# Tab through the app and verify:
# - Focus never disappears
# - All buttons have accessible names
# - Modals trap focus
```

---

## Execution Order

```
1. Task 1 (CSS) and Task 2 (React Query) can run IN PARALLEL
   - CSS work is in presentation files (tsx/css)
   - React Query work is in hooks/api files
   - No file conflicts

2. Task 3 (Responsive) depends on Task 1 (needs CSS classes first)

3. Task 4 (Error Boundaries) depends on Task 1 (needs CSS classes for error state styling)

4. Task 5 (Accessibility) can run INDEPENDENTLY after Task 1
```

## Exit Criteria

- [ ] `npm run build` → 0 errors
- [ ] `npx vitest run` → all 127+ tests pass
- [ ] Zero `style={{` in `src/components/Layout/` and `src/pages/LoginPage.tsx`
- [ ] React Query covers: materials, curriculums, diagnosticos, admin/estado-sistema
- [ ] Sidebar collapses to hamburger on mobile viewport (≤768px)
- [ ] Error boundaries wrap each major page section
- [ ] Keyboard navigation: Tab, Enter, Escape all work correctly

## Parallel Work Hint

Use Task tool to dispatch two sub-agents simultaneously:
- `@code-builder` for Task 1 (CSS Modules migration)
- `@code-builder` for Task 2 (React Query setup + hooks)

They work on different files with no conflicts.