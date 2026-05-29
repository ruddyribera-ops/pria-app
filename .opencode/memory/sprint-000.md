# Sprint 0: KILL THE BULLSHIT — Completion Report
## Date: 2026-05-27 | Agent: M2.7 (via parallel dispatch)

## Accomplished
- [x] 0a: Fixed server.js + index.ts — initDB() and seed() now properly awaited
- [x] 0b: Sanitized seed.ts — admin-only with crypto-generated password
- [x] 0c: Killed getMockMaterials() — no more fake PDFs on API failure
- [x] 0d: Killed getMockEstadoSistema() — no more fake motor statuses
- [x] 0e: Fixed Sidebar polling — only runs when dropdown is open
- [x] 0f: Fixed deleteMaterial — no more lying success toasts
- [x] 0g: Removed fake apiLogin() call from AuthContext useEffect

## Files Modified
- \server.js\ — await added to initDB() and seed() calls (lines 17-18)
- \server/src/index.ts\ — same fix (lines 9-10)
- \server/src/db/seed.ts\ — replaced: admin-only, generated password (30 lines)
- \src/api/materials.ts\ — deleted getMockMaterials() (~8 lines removed)
- \src/api/admin.ts\ — deleted getMockEstadoSistema() (~6 lines removed)
- \src/pages/MaterialesPage.tsx\ — removed mock fallback, honest deleteMaterial
- \src/components/Layout/Sidebar.tsx\ — conditional polling, null on error
- \src/context/AuthContext.tsx\ — removed apiLogin() from useEffect

## Verification
- [x] npm run typecheck: ✅ 0 errors
- [x] npm run build: ✅ 0 errors  
- [x] npx vitest run: ✅ 27/27 passed
- [x] grep getMockMaterials: ✅ 0 results anywhere
- [x] grep getMockEstadoSistema: ✅ 0 results anywhere
- [x] server.js initDB()/seed(): ✅ both awaited
- [x] index.ts initDB()/seed(): ✅ both awaited
- [x] AuthContext apiLogin in useEffect: ✅ removed
- [x] Sidebar polling conditional on estadoOpen: ✅ confirmed

## Edge Cases Found
- Previous seed had existing 4 users (ruddy/adela/maria/admin) in SQLite db — admin-only seed will see count>0 and skip. User may need to drop DB for clean state.
- Sidebar already imported getMockEstadoSistema in import — needed simultaneous import fix + mock removal to avoid build errors.

## Lessons
- Grouping tasks by file (0c+0f together, 0d+0e together) avoided merge conflicts.
- Parallel dispatch with 5 agents works well when file conflicts are mapped first.
- grep across .ts + .tsx + .js covers all source — no blind spots.
