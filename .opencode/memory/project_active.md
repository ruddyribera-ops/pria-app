# PRIA v10 — Project Memory

## Overview
React frontend (Vite + TypeScript + React Router 7 + Axios) for PRIA v5.4 API.
Codecademy-style UI: dark sidebar `#1c1e24`, green accent `#3A9E5E`.

## Backend API
- **URL:** https://steadfast-alignment-production.up.railway.app
- **OpenAPI:** /openapi.json
- **Auth:** POST /api/auth/login { usuario, contrasena } → JWT Bearer token
- **Fallback:** Mock data si la API no responde

## Key Files
```
src/
├── api/           # 9 módulos: client, auth, schedule, blocks, materials, diagnosticos, users, admin, motores
├── lib/pptx/      # PPTX Generator: types, designSystem, buildSlides, mockContent, phaseDefinitions, multiPhaseContent
├── context/       # AuthContext (JWT + mock fallback)
├── components/    # UI, Layout (Sidebar, Header, AppLayout), Auth, Motores (PhaseStepper, PhaseNavigation)
├── pages/         # 9 páginas: Login, Diario, Semanal, Trimestral, Slides, Materiales, Diagnosticos, Admin, NotFound
├── types/         # All TypeScript interfaces
├── hooks/         # useMotorGeneration, useMultiPhaseGeneration
├── App.tsx        # Router con todas las rutas activas
└── App.css        # Codecademy design system
```

## Routes (all active)
| Route | Page | API Calls |
|-------|------|-----------|
| /login | LoginPage | POST /api/auth/login |
| /slides | SlideGeneratorPage | POST /api/motores/slides/ + poll + PPTX download |
| /diario | DiarioPage | GET /api/schedule/{code}/{dia}, GET /api/admin/estado-sistema |
| /semanal | SemanalPage | GET /api/schedule/{code}, POST /api/motores/* |
| /trimestral | TrimestralPage | POST /api/motores/pdc |
| /materiales | MaterialesPage | CRUD /api/materials |
| /diagnosticos | DiagnosticosPage | CRUD /api/diagnosticos |
| /admin | AdminPage | CRUD /api/users, /api/blocks, /api/admin/* |

## Sidebar Sections
- **Perfil Docente** (dropdown con datos + Cerrar Sesión)
- **Generación:** Diapositivas 🖼️
- **Planificación:** Diario 🌅, Semanal 📅, Trimestral 📆
- **Recursos:** Materiales 📥, Diagnósticos 🩺
- **Administración:** Panel Admin ⚙️ (solo rol=admin)
- **Nivel Educativo** (selectors inline: nivel + grado)
- **Estado del Sistema** (collapsible, 7 motores con status dots)
- Reiniciar Todo 🧹, Cerrar Sesión 🚪

## PPTX Generator + Multi-Fase
- `src/lib/pptx/types.ts` — Slide content data models
- `src/lib/pptx/designSystem.ts` — 10 paletas por materia, fuentes (Bitter + Calibri), dimensiones 16:9
- `src/lib/pptx/buildSlides.ts` — PptxGenJS builder: cover, objectives, content cards, activities, page numbers
- `src/lib/pptx/mockContent.ts` — Contenido educativo generado por materia y motor (slides, plan, ficha, quiz, pdc)
- `src/lib/pptx/phaseDefinitions.ts` — Config de fases por motor: slides (3), plan (3), ficha (2), quiz (2), pdc (3), synthesis (2)
- `src/lib/pptx/multiPhaseContent.ts` — Generadores de contenido por fase + mergePhaseResults para PPTX
- `src/hooks/useMultiPhaseGeneration.ts` — Hook multi-fase: submit por fase, resultados acumulados, navegación entre fases
- `src/components/Motores/PhaseStepper.tsx` — Stepper visual con checkmarks y conectores
- `src/components/Motores/PhaseNavigation.tsx` — Anterior/Regenerar/Siguiente/Cerrar
- Paletas daltónico-safe únicas por materia | Bloom taxonomy con badges | 📝 boxes
- ⬇️ Descargar PPTX en: SlideGeneratorPage (multi-fase), SemanalPage, TrimestralPage

## Credenciales (mock)
- Usuario: admin / Contraseña: cualquier cosa

## Known Gotchas
- Backend Railway API es DIFERENTE al código en el repo `ruddyribera-ops/pria-app` (commit 0e14037)
- API de Railway tiene /api/auth/login con { usuario, contrasena } NO email/password
- Mock token empieza con "mock-" y el interceptor 401 lo salta (no limpia sesión)
- Vite proxy: /api → https://steadfast-alignment-production.up.railway.app
- Railway API devuelve 500 en login (posiblemente caída o cambio)

## What's Next
- Debug login real contra Railway API (500 error)
