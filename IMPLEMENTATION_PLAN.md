# PRIA v7 — COMPREHENSIVE IMPLEMENTATION PLAN

### Executive Summary (5 Lines)

PRIA v7 is a curriculum planning system combining v5.4 API completeness (26 endpoints) with neuroinclusive teacher workflows and school branding. We are implementing a 6-phase plan: Foundation ✅ COMPLETE, PDC Module (Week 2), Planning Module (Week 3), Neuroinclusive UI (Week 4), Export & Branding (Week 5), Integration & Testing (Week 6). **Target Launch:** 2026-06-18 (6 weeks). **Deliverable:** Fully functional web app supporting Las Palmas school, 6 subjects, 10 grades, 3 trimesters, 4 neuroinclusive profiles, AI-powered adaptations, batch export.

---

## Phase Timeline (6 Phases)

**Phase 1: Foundation (Week 1 — MAY 7-11) ✅ COMPLETE**
- Duration: 5 days
- Acceptance: Docker (PostgreSQL, Redis) healthy; FastAPI running; Next.js responsive; Auth working (register/login/dashboard)
- Status: ✅ All components verified and tested

**Phase 2: PDC Module (Week 2 — MAY 14-18)**
- Duration: 5 days
- Acceptance: 26 API endpoints implemented; MESCP CRUD working; Gemini AI adaptations functioning for 4 profiles; PDF/XLSX preview visible
- Critical: Standardize AsyncSession in PDCService; implement all API endpoints; establish caching

**Phase 3: Planning Module (Week 3 — MAY 21-25)**
- Duration: 5 days
- Acceptance: 16 weekly templates auto-generated from PDC; Calendar UI functional; Momentos (Inicio/Desarrollo/Cierre) editable; copy-week feature working
- Critical: Motor M1a logic correct; Celery async tasks queued properly

**Phase 4: Neuroinclusive UI (Week 4 — MAY 28-JUN 1)**
- Duration: 5 days
- Acceptance: All 4 profiles (Dislexia, ADHD, TEA, Dyscalculia) functional; ProfileSwitcher saves to localStorage; WCAG 2.1 AA audit passes
- Critical: Dyslexie font loads correctly; high contrast mode verified; reduce animations respected

**Phase 5: Export & Branding (Week 5 — JUN 4-8)**
- Duration: 5 days
- Acceptance: DOCX export with school logo; XLSX with formulas; PDF with colors; batch ZIP working; export queue visible
- Critical: Branding applied consistently; file naming convention enforced; S3 or local storage confirmed

**Phase 6: Integration & Testing (Week 6 — JUN 11-15)**
- Duration: 5 days
- Acceptance: 80% code coverage achieved; 3 E2E workflows pass; API <200ms response times; zero console errors
- Critical: All tests passing; Dockerfile builds; CI/CD pipeline green; Railway staging ready

---

## File Manifest — Organized by Phase

**Total Files to Create/Modify: 90+**

### Phase 2: PDC Module (25 files)

**Backend (13 files):**
- D:\pria-v7\backend\app\models\pdc.py (extend: add MESCP columns)
- D:\pria-v7\backend\app\models\adaptaciones.py (new)
- D:\pria-v7\backend\app\models\inteligencias.py (new)
- D:\pria-v7\backend\app\models\productos.py (new)
- D:\pria-v7\backend\app\schemas\pdc.py (extend)
- D:\pria-v7\backend\app\pdc\routes.py (all 26 endpoints)
- D:\pria-v7\backend\app\services\pdc_service.py (MESCP CRUD)
- D:\pria-v7\backend\app\services\gemini_service.py (AI prompts, error fallback)
- D:\pria-v7\backend\app\services\cache_service.py (Redis caching)
- D:\pria-v7\backend\app\services\import_service.py (DOCX parsing)
- D:\pria-v7\backend\app\utils\validators.py (validation)
- D:\pria-v7\backend\alembic\env.py (migration setup)
- D:\pria-v7\backend\alembic\versions\0002_pdc_extensions.py (schema migration)

**Frontend (12 files):**
- D:\pria-v7\frontend\app\components\pdc\PDCEditor.tsx (refactor layout)
- D:\pria-v7\frontend\app\components\pdc\MESCPTable.tsx (6-column table)
- D:\pria-v7\frontend\app\components\pdc\AdaptacionesPanel.tsx (textarea)
- D:\pria-v7\frontend\app\components\pdc\InteligenciasMultiples.tsx (8 checkboxes)
- D:\pria-v7\frontend\app\components\pdc\ProductosEditor.tsx (rich text)
- D:\pria-v7\frontend\app\components\pdc\AdaptationPanel.tsx (refine)
- D:\pria-v7\frontend\app\components\pdc\ProfileSelector.tsx (refine)
- D:\pria-v7\frontend\app\components\pdc\WeeklyPlanSkeleton.tsx (16 rows)
- D:\pria-v7\frontend\app\components\pdc\FileUploader.tsx (DOCX upload)
- D:\pria-v7\frontend\app\lib\api\pdc.ts (all 26 endpoints)
- D:\pria-v7\frontend\app\lib\types\pdc.ts (TypeScript types)
- D:\pria-v7\frontend\app\store\pdcStore.ts (extend Zustand)

### Phase 3: Planning Module (18 files)

**Backend (9 files):**
- D:\pria-v7\backend\app\models\weekly_plan.py (extend Momentos)
- D:\pria-v7\backend\app\models\microobjetivos.py (new)
- D:\pria-v7\backend\app\models\calendario_escolar.py (Las Palmas 2026)
- D:\pria-v7\backend\app\schemas\planning.py (extend)
- D:\pria-v7\backend\app\planning\routes.py (all endpoints)
- D:\pria-v7\backend\app\services\planning_service.py (new)
- D:\pria-v7\backend\app\services\motor_m1a_service.py (45-min logic)
- D:\pria-v7\backend\app\services\microobjetivos_service.py (Gemini generator)
- D:\pria-v7\backend\app\tasks\celery_config.py (async queue)

**Frontend (9 files):**
- D:\pria-v7\frontend\app\components\planning\CalendarView.tsx (grid calendar)
- D:\pria-v7\frontend\app\components\planning\WeeklyPlanEditor.tsx (form)
- D:\pria-v7\frontend\app\components\planning\MomentosEditor.tsx (3 sections)
- D:\pria-v7\frontend\app\components\planning\LessonDetail.tsx (full view)
- D:\pria-v7\frontend\app\components\planning\GeneratePlanModal.tsx (modal)
- D:\pria-v7\frontend\app\lib\api\planning.ts (endpoints)
- D:\pria-v7\frontend\app\lib\hooks\useWeeklyPlan.ts (hook)
- D:\pria-v7\frontend\app\store\planningStore.ts (store)
- D:\pria-v7\frontend\app\(planning)\calendar\page.tsx (page)

### Phase 4: Neuroinclusive UI (15 files)

**Backend (4 files):**
- D:\pria-v7\backend\app\models\user_profile.py (profile preference)
- D:\pria-v7\backend\app\models\student_profile.py (accessibility settings)
- D:\pria-v7\backend\app\schemas\accessibility.py (schema)
- D:\pria-v7\backend\app\routes\accessibility.py (GET/PUT endpoints)

**Frontend (11 files):**
- D:\pria-v7\frontend\app\components\accessibility\ProfileSwitcher.tsx (dropdown)
- D:\pria-v7\frontend\app\components\accessibility\DislexiaTheme.tsx (Dyslexie loader)
- D:\pria-v7\frontend\app\components\accessibility\ADHDTheme.tsx (high contrast)
- D:\pria-v7\frontend\app\components\accessibility\TEATheme.tsx (predictable layout)
- D:\pria-v7\frontend\app\components\accessibility\DyscalculiaTheme.tsx (monospace)
- D:\pria-v7\frontend\app\styles\themes\dislexia.css (14pt, 2.0 spacing)
- D:\pria-v7\frontend\app\styles\themes\adhd.css (color-coded, progress)
- D:\pria-v7\frontend\app\styles\themes\tea.css (grid layout)
- D:\pria-v7\frontend\app\styles\themes\dyscalculia.css (monospace numbers)
- D:\pria-v7\frontend\app\lib\hooks\useAccessibilityProfile.ts (hook)
- D:\pria-v7\frontend\app\store\accessibilityStore.ts (store)

### Phase 5: Export & Branding (14 files)

**Backend (8 files):**
- D:\pria-v7\backend\app\models\export_job.py (tracking)
- D:\pria-v7\backend\app\models\school_branding.py (branding config)
- D:\pria-v7\backend\app\schemas\export.py (schema)
- D:\pria-v7\backend\app\routes\export.py (API endpoints)
- D:\pria-v7\backend\app\services\docx_export_service.py (Word generation)
- D:\pria-v7\backend\app\services\xlsx_export_service.py (Excel generation)
- D:\pria-v7\backend\app\services\pdf_export_service.py (PDF generation)
- D:\pria-v7\backend\app\services\branding_service.py (apply logos/colors)

**Frontend (6 files):**
- D:\pria-v7\frontend\app\components\export\ExportModal.tsx (UI)
- D:\pria-v7\frontend\app\components\export\ExportPreview.tsx (preview)
- D:\pria-v7\frontend\app\components\export\BrandingSelector.tsx (branding picker)
- D:\pria-v7\frontend\app\components\export\ExportQueue.tsx (job status)
- D:\pria-v7\frontend\app\lib\api\export.ts (endpoints)
- D:\pria-v7\frontend\app\store\exportStore.ts (store)

### Phase 6: Testing & Deployment (28 files)

**Backend Tests (10 files):**
- D:\pria-v7\backend\tests\conftest.py (fixtures)
- D:\pria-v7\backend\tests\unit\test_auth.py
- D:\pria-v7\backend\tests\unit\test_pdc_service.py
- D:\pria-v7\backend\tests\unit\test_planning_service.py
- D:\pria-v7\backend\tests\unit\test_export_service.py
- D:\pria-v7\backend\tests\integration\test_pdc_workflow.py
- D:\pria-v7\backend\tests\integration\test_planning_workflow.py
- D:\pria-v7\backend\tests\integration\test_auth_flow.py
- D:\pria-v7\backend\tests\integration\test_export_workflow.py
- D:\pria-v7\backend\.coveragerc (coverage config)

**Frontend Tests (6 files):**
- D:\pria-v7\frontend\__tests__\components\PDCEditor.test.tsx
- D:\pria-v7\frontend\__tests__\components\CalendarView.test.tsx
- D:\pria-v7\frontend\__tests__\hooks\usePDC.test.ts
- D:\pria-v7\frontend\e2e\auth.spec.ts (Playwright)
- D:\pria-v7\frontend\e2e\pdc_workflow.spec.ts
- D:\pria-v7\frontend\e2e\export.spec.ts

**DevOps (9 files):**
- D:\pria-v7\backend\Dockerfile
- D:\pria-v7\backend\docker-compose.prod.yml
- D:\pria-v7\frontend\Dockerfile
- D:\pria-v7\.github\workflows\test.yml
- D:\pria-v7\.github\workflows\deploy.yml
- D:\pria-v7\DEPLOYMENT_GUIDE.md
- D:\pria-v7\backend\README.md
- D:\pria-v7\frontend\README.md
- D:\pria-v7\.env.example (update)

---

## Critical Blockers Identified

1. **Type Mismatch: PDCService AsyncSession vs Sync (File: D:\pria-v7\backend\app\services\pdc_service.py:16)**
   - Issue: Service expects AsyncSession but routes.py passes sync Session
   - Impact: Blocking — Prevents database operations
   - Solution: Standardize to AsyncSession; update all routes to use await
   - Acceptance: All PDC operations async; no blocking calls

2. **Unimplemented Form Submission (File: D:\pria-v7\frontend\app\components\pdc\ContentEditor.tsx)**
   - Issue: No save button; no API call to backend
   - Impact: Users cannot persist PDC edits
   - Solution: Add save button; call updatePDC() API; show toast
   - Acceptance: PUT /pdc/{pdc_id} succeeds; data persists in database

3. **Hardcoded Calendar & Grades (Multiple files)**
   - Issue: Weeks 15-30, Primaria 1-6, Secundaria 1-4 hardcoded in routes
   - Impact: Cannot support other schools or custom calendars
   - Solution: Create CalendarioEscolar table; seed with Las Palmas 2026 data
   - Acceptance: GET /api/calendar returns database rows; admin can modify

4. **Missing Gemini Error Fallback (File: D:\pria-v7\backend\app\services\gemini_service.py)**
   - Issue: No exception handling if API rate-limited or offline
   - Impact: Users see 500 error instead of graceful degradation
   - Solution: Catch exceptions; return template adaptation {"adapted_content": "Unable to generate. Please try again."}
   - Acceptance: API failure doesn't crash app; helpful error message shown

5. **No Database Migrations (Alembic missing)**
   - Issue: No schema version control; can't collaborate or rollback
   - Impact: Manual schema management is error-prone
   - Solution: Set up Alembic; create baseline + per-phase migrations
   - Acceptance: `alembic upgrade head` applies all migrations; schema matches models.py

6. **Missing TypeScript Types (File: D:\pria-v7\frontend\app\lib\types\pdc.ts)**
   - Issue: API responses use `any`; IDE autocomplete doesn't work
   - Impact: Refactoring breaks silently; type safety lost
   - Solution: Create comprehensive types file; use in all components
   - Acceptance: No `any` in PDC-related files; full IDE support

---

## v5.4 → v7 API Endpoint Mapping (26 Total)

### Authentication (4)
- POST /api/auth/register → D:\pria-v7\backend\app\auth\routes.py
- POST /api/auth/login → D:\pria-v7\backend\app\auth\routes.py
- POST /api/auth/token/refresh → D:\pria-v7\backend\app\auth\routes.py (MISSING)
- GET /api/auth/validate → D:\pria-v7\backend\app\auth\routes.py (MISSING)

### PDC Management (10)
- GET /api/pdc/list → D:\pria-v7\backend\app\pdc\routes.py (PARTIAL)
- POST /api/pdc/create → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- GET /api/pdc/{pdc_id} → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- PUT /api/pdc/{pdc_id} → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- DELETE /api/pdc/{pdc_id} → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- GET /api/pdc/{pdc_id}/import → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- POST /api/pdc/{pdc_id}/import → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- GET /api/pdc/{pdc_id}/export → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- POST /api/pdc/{pdc_id}/export → D:\pria-v7\backend\app\export\routes.py (MISSING)
- GET /api/pdc/{pdc_id}/status → D:\pria-v7\backend\app\export\routes.py (MISSING)

### MESCP Rows (4)
- GET /api/pdc/{pdc_id}/mescp/rows → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- POST /api/pdc/{pdc_id}/mescp/rows → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- PUT /api/pdc/{pdc_id}/mescp/rows/{row_id} → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- DELETE /api/pdc/{pdc_id}/mescp/rows/{row_id} → D:\pria-v7\backend\app\pdc\routes.py (MISSING)

### Adaptations (5)
- POST /api/pdc/{pdc_id}/adaptations/request → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- GET /api/pdc/{pdc_id}/adaptations → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- PUT /api/pdc/{pdc_id}/adaptations/{adaptation_id}/approve → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- PUT /api/pdc/{pdc_id}/adaptations/{adaptation_id}/reject → D:\pria-v7\backend\app\pdc\routes.py (MISSING)
- GET /api/pdc/{pdc_id}/inteligencias → D:\pria-v7\backend\app\pdc\routes.py (MISSING)

### Planning (3)
- GET /api/planning/calendar → D:\pria-v7\backend\app\planning\routes.py (MISSING)
- POST /api/planning/{pdc_id}/auto-generate → D:\pria-v7\backend\app\planning\routes.py (MISSING)
- GET /api/planning/week/{week_id} → D:\pria-v7\backend\app\planning\routes.py (MISSING)

---

## Database Migration Plan

**Phase 2 — Alembic Setup:**
- D:\pria-v7\backend\alembic\env.py → Initialize Alembic; set SQLAlchemy metadata
- D:\pria-v7\backend\alembic\versions\0002_pdc_extensions.py → Add MESCP columns; create adaptaciones, inteligencias, productos tables

**Phase 3 — Planning Extensions:**
- D:\pria-v7\backend\alembic\versions\0003_planning_extensions.py → Add momentos (inicio, desarrollo, cierre) to weekly_plans; create microobjetivos, calendario_escolar

**Phase 4-5 — Accessibility & Export:**
- D:\pria-v7\backend\alembic\versions\0004_accessibility_export.py → Create user_profiles, student_profiles, export_jobs, school_branding tables

**Acceptance:** `alembic upgrade head` applies all migrations without error; schema matches models.py; no data loss

---

## AI/Gemini Integration Plan

**Service:** D:\pria-v7\backend\app\services\gemini_service.py

### Prompt Templates (4 Profiles)

1. **Dislexia:** "Use simple words (8th-grade max), short sentences (10 words), sans-serif 14pt, 1.5+ spacing, visual aids, no italics, break into chunks"

2. **ADHD:** "Color-code steps, numbered lists, 5-10 min chunks with breaks, progress indicator, movement-friendly language ('stand up...'), bold keywords"

3. **TEA (Autismo):** "Predictable structure, explicit instructions, plain text only, literal language (no idioms), social story format, transition warnings, visual schedules"

4. **Dyscalculia:** "Monospace font for numbers, color-code by magnitude, tens frames, base-10 blocks, concrete objects ('3 apples' not '3'), pre-filled grids"

### Caching & Performance
- Redis (production) or in-memory (dev); 7-day TTL; 50% expected hit rate
- Error Fallback: If API fails, return default: `{"adapted_content": "Content unavailable. Please try again.", "ai_confidence_score": 0.0}`
- **Acceptance:** All 4 profiles generate unique, appropriate adaptations; cache reduces API calls 50%; no crashes on API failure

---

## Neuroinclusive UI Components

**4 Profiles with Dedicated CSS + React Components:**

1. **Dislexia:** Dyslexie font (14pt), 2.0 line spacing, warm background, no italics
2. **ADHD:** High contrast (#0066ff, #ff6600), color-coded sections, progress bars, reduced animations
3. **TEA:** Predictable grid layout, minimal clutter, text-only labels, no decorative elements
4. **Dyscalculia:** Monospace font for numbers, color-coded by magnitude (single=blue, double=orange, triple=red), tens frames

**ProfileSwitcher Component:** D:\pria-v7\frontend\app\components\accessibility\ProfileSwitcher.tsx
- Dropdown with 5 options (Default, Dislexia, ADHD, TEA, Dyscalculia)
- Saves to localStorage + backend
- Applies theme CSS on selection

**Hooks & Stores:**
- D:\pria-v7\frontend\app\lib\hooks\useAccessibilityProfile.ts → Load/save preference; manage CSS injection
- D:\pria-v7\frontend\app\store\accessibilityStore.ts → Zustand store for profile state

**Acceptance:** All 4 profiles render correctly; ProfileSwitcher saves preference; WCAG 2.1 AA audit passes; responsive on mobile/tablet/desktop

---

## Export Pipeline

**Formats Supported:** DOCX (school branding), XLSX (formulas), PDF (colors), ZIP (batch)

### DOCX Export (D:\pria-v7\backend\app\services\docx_export_service.py)
- Add school logo in header
- 6-column MESCP table with styled rows
- Adaptaciones, Inteligencias Múltiples, Productos sections
- Footer with school name, date, page numbers
- Font based on profile (Dyslexie 14pt, Arial 12pt, Courier 12pt)
- Return: bytes ready for download

### XLSX Export (D:\pria-v7\backend\app\services\xlsx_export_service.py)
- Weekly Plans sheet: 16 rows, status color-coded
- Momentos Summary sheet: aggregated word counts, formulas
- School Info sheet: metadata
- Conditional formatting: red if >500 words

### API Endpoints (D:\pria-v7\backend\app\routes\export.py)
- POST /api/export/pdc → Body: {pdc_id, format, branding_id?} → Returns: {job_id, status, eta}
- POST /api/export/batch → Body: {pdc_ids[], format, branding_id?} → Async Celery task
- GET /api/export/{job_id} → Returns: {status, progress, file_url}
- GET /api/export/{job_id}/download → File download

**Acceptance:** Export completes in <5s; files contain school branding; formats match v5.4 spec; batch ZIP organized by subject

---

## Verification Checklist (Phase 6)

### File Audit
- [ ] All 90+ files exist (no stubs)
- [ ] Linting passes: `mypy backend/app --strict`, `npm run lint`
- [ ] No syntax errors

### Build Test
- [ ] Backend: `pip install -r requirements.txt` succeeds
- [ ] Backend imports: `python -c "from app.main import app"` works
- [ ] Frontend: `npm run build` succeeds; bundle <500KB gzip

### E2E Workflows (3 Critical)
- [ ] Register → Login → Create PDC → Add MESCP row → Save → Logout
- [ ] Open PDC → Generate AI adaptations (all 4 profiles) → Approve 1 → Reject 1
- [ ] Generate weekly plans → Edit momentos → Export DOCX → Download → Verify content

### Console & Network
- [ ] 0 JavaScript errors in console
- [ ] 0 unhandled promise rejections
- [ ] All API calls return 2xx; none 4xx/5xx
- [ ] API response times <200ms (p95)
- [ ] <50 network requests on page load

**Acceptance:** All 3 workflows complete in <2 min; console clean; all tests passing

---

## Dependencies & Critical Path

1. **Phase 1 → Phase 2:** Auth + database required
2. **Phase 2 → Phase 3:** PDC content required for weekly plans
3. **Phase 3 → Phase 4:** Planning UI required for profile theming
4. **Phase 2/3 → Phase 5:** Both modules needed for export
5. **All phases → Phase 6:** Full system required for testing

**Parallel Work Possible:**
- Phase 2 backend + frontend (async after Phase 1)
- Phase 4 CSS themes + Phase 3 UI (different layers)

---

## Risk Mitigation

**Risk 1: Gemini API Rate Limiting (Medium probability, High impact)**
- Mitigation: Request higher quota early; cache 7 days; fallback template; daily monitoring
- Acceptance: API failure doesn't crash app; users see helpful error

**Risk 2: Database Migration Failures (Low probability, Critical impact)**
- Mitigation: Use Alembic; test in staging; create rollback migrations; backup production
- Acceptance: All migrations have rollback; tested before deployment

**Risk 3: Performance on Large PDCs (Low probability, Medium impact)**
- Mitigation: Paginate MESCP (20 rows/page); virtualize table; debounce saves; index database
- Acceptance: 500-row PDC loads <2s; export <5s; edit feels responsive

---

## Critical Files for Implementation

### Top 5 Files Per Phase

**Phase 2 (PDC):**
1. D:\pria-v7\backend\app\services\pdc_service.py (MESCP CRUD + AI)
2. D:\pria-v7\backend\app\pdc\routes.py (26 endpoints)
3. D:\pria-v7\frontend\app\components\pdc\MESCPTable.tsx (UI table)
4. D:\pria-v7\frontend\app\lib\api\pdc.ts (API client)
5. D:\pria-v7\backend\app\services\gemini_service.py (AI prompts)

**Phase 3 (Planning):**
1. D:\pria-v7\backend\app\services\motor_m1a_service.py (45-min logic)
2. D:\pria-v7\backend\app\planning\routes.py (endpoints)
3. D:\pria-v7\frontend\app\components\planning\CalendarView.tsx (UI)
4. D:\pria-v7\frontend\app\components\planning\MomentosEditor.tsx (edit)
5. D:\pria-v7\backend\alembic\versions\0003_planning_extensions.py (migration)

**Phase 4 (Neuroinclusive):**
1. D:\pria-v7\frontend\app\styles\themes\dislexia.css (Dyslexie rules)
2. D:\pria-v7\frontend\app\styles\themes\adhd.css (high contrast)
3. D:\pria-v7\frontend\app\components\accessibility\ProfileSwitcher.tsx (UI)
4. D:\pria-v7\frontend\app\lib\hooks\useAccessibilityProfile.ts (hook)
5. D:\pria-v7\frontend\app\store\accessibilityStore.ts (state)

**Phase 5 (Export):**
1. D:\pria-v7\backend\app\services\docx_export_service.py (DOCX gen)
2. D:\pria-v7\backend\app\routes\export.py (API)
3. D:\pria-v7\backend\app\tasks\export_tasks.py (async)
4. D:\pria-v7\frontend\app\components\export\ExportModal.tsx (UI)
5. D:\pria-v7\backend\alembic\versions\0004_export_and_branding.py (migration)

**Phase 6 (Testing):**
1. D:\pria-v7\backend\tests\integration\test_pdc_workflow.py (E2E)
2. D:\pria-v7\frontend\e2e\pdc_workflow.spec.ts (Playwright)
3. D:\pria-v7\backend\Dockerfile (production)
4. D:\pria-v7\.github\workflows\test.yml (CI/CD)
5. D:\pria-v7\DEPLOYMENT_GUIDE.md (docs)

---

**Document Status:** ✅ READY FOR IMPLEMENTATION  
**Last Updated:** 2026-05-07  
**Next Review:** End of Phase 2 (Friday 2026-05-18)
