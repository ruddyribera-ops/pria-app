# ══════════════════════════════════════════════════════════════════
#  HANDOVER — PRIA v10 Sprint B: Code Quality
#  Powered by MiniMax M2.7
#  Source: MASTER_PLAN_REMEDIATION.md (items 2.1.1, 2.3.1, 2.3.2, 3.3, 3.1)
# ══════════════════════════════════════════════════════════════════

You are an expert full-stack TypeScript engineer. Complete these 5 tasks
on PRIA v10 at D:\ACTIVE PROJECTS\PRIA v10.

Before implementing, state ONE alternative approach and why you chose this one.

Current state: Build passes, typecheck passes, 92/92 tests passing,
rate limiter PG-backed, UTF-8 clean, graceful shutdown added,
body limit 10mb. Frontend dir: D:\ACTIVE PROJECTS\PRIA v10\src.

**Scripts:** `npm run build`, `npm run typecheck`, `npx vitest run` (from `D:\ACTIVE PROJECTS\PRIA v10`)

---

## Task 1: Extract AdminPage (775L) → subcomponents (25 min)

### Problem
`src/pages/AdminPage.tsx` is 775 lines with 5 tabs rendered via giant `if (activeTab === X)` switch inside the JSX. Every tab has inline styles duplicated inline. 0 tests.

### Files
- **TARGET:** `src/pages/AdminPage.tsx`
- **CREATE:** `src/pages/AdminArchivosPanel.tsx`
- **CREATE:** `src/pages/AdminUsuariosPanel.tsx`
- **CREATE:** `src/pages/AdminResetPanel.tsx`
- **CREATE:** `src/pages/AdminCachePanel.tsx`
- **CREATE:** `src/pages/AdminBloquesPanel.tsx`
- **CREATE:** `src/styles/adminTheme.ts` — shared inline style objects (labelStyle, inputStyle, greenBtnStyle, cardStyle, tabBtnStyle)

### Pattern
```typescript
// adminTheme.ts — extract ALL repeated style objects here
export const adminTheme = {
  label: { display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' },
  input: { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff', boxSizing: 'border-box' },
  greenBtn: { padding: '0.5rem 1.5rem', background: '#3A9E5E', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500, fontSize: '0.8125rem', cursor: 'pointer' },
  card: { background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', overflow: 'hidden' },
  tabBtn: (active: boolean) => ({ padding: '0.5rem 1rem', border: active ? 'none' : '1px solid #e6e6eb', borderRadius: '4px', background: active ? '#3A9E5E' : '#fff', color: active ? '#fff' : '#6b6b80', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }),
};
```

```typescript
// AdminUsuariosPanel.tsx — single responsibility
interface Props { teacherCode: string; showToast: (msg: string, type: string) => void; }
export default function AdminUsuariosPanel({ teacherCode, showToast }: Props) { ... }
// Move: users state, loadUsers, handleCreateUser, handleEditUser, handleDeleteUser, table + form + modal
```

```typescript
// AdminPage.tsx — becomes a thin shell
import AdminArchivosPanel from './AdminArchivosPanel';
import AdminUsuariosPanel from './AdminUsuariosPanel';
// ... etc

export default function AdminPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('archivos');

  const TABS = [...] // same

  return (
    <div>
      <Header title="⚙️ Panel de Administración" subtitle="Gestión del sistema, usuarios y archivos fuente" />
      {/* Tabs bar — keep in AdminPage */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {TABS.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={adminTheme.tabBtn(activeTab === tab.id)}>{tab.label}</button>)}
      </div>
      {activeTab === 'archivos' && <AdminArchivosPanel />}
      {activeTab === 'usuarios' && <AdminUsuariosPanel teacherCode={teacherCode} showToast={showToast} />}
      {activeTab === 'reset' && <AdminResetPanel teacherCode={teacherCode} />}
      {activeTab === 'cache' && <AdminCachePanel />}
      {activeTab === 'bloques' && <AdminBloquesPanel teacherCode={teacherCode} showToast={showToast} />}
    </div>
  );
}
```

### Verify
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"; npm run build 2>&1; npm run typecheck 2>&1; npx vitest run 2>&1
```

Also verify: AdminPage renders all 5 tabs without crashing → `npx tsc --noEmit` passes.

---

## Task 2: Split documentIngester.ts (1002L) → smaller files (30 min)

### Problem
`src/lib/ingest/documentIngester.ts` is 1002 lines containing 7 ingestion pipelines (PDF, DOCX, image, text, HTML, PPTX, XLSX) + ZIP parser + curriculum extractor + AI bridge. Mixed concerns, no tests, no separation.

### Files
- **TARGET:** `src/lib/ingest/documentIngester.ts`
- **CREATE:** `src/lib/ingest/fileTypeDetector.ts` — `detectFileType()`
- **CREATE:** `src/lib/ingest/pdfExtractor.ts` — `ingestPdf()`
- **CREATE:** `src/lib/ingest/docxParser.ts` — `ingestDocx()`, `extractTextFromXml()`
- **CREATE:** `src/lib/ingest/ocrWorker.ts` — `ingestImage()`
- **CREATE:** `src/lib/ingest/pptxParser.ts` — `ingestPptx()`
- **CREATE:** `src/lib/ingest/xlsxParser.ts` — `ingestXlsx()`
- **CREATE:** `src/lib/ingest/zipParser.ts` — `parseZip()`, `readU16`, `readU32`
- **CREATE:** `src/lib/ingest/curriculumExtractor.ts` — `extractCurriculum()`, `extractCurriculumWithAI()`, `ingestAndExtract()`
- **MODIFY:** `src/lib/ingest/documentIngester.ts` — re-export everything + main `ingestDocument()`

### Pattern
```typescript
// pdfExtractor.ts
import type { PageContent, IngestWarning } from './types'; // shared types
export async function ingestPdf(file: File, onProgress?: (stage: string, percent: number) => void): Promise<{ texts: PageContent[]; warnings: IngestWarning[]; images: string[] }> {
  // paste from documentIngester.ts lines 140-229
}
```

```typescript
// zipParser.ts
export function readU16(view: DataView, offset: number): number { return view.getUint16(offset, true); }
export function readU32(view: DataView, offset: number): number { return view.getUint32(offset, true); }
export async function parseZip(buffer: ArrayBuffer): Promise<Record<string, string>> {
  // paste from lines 646-703
}
```

```typescript
// curriculumExtractor.ts
import type { IngestResult, CurriculumResult } from './types';
import { extractCurriculum as fallbackExtract } from './curriculumExtractor';
export async function extractCurriculumWithAI(ingest: IngestResult, grado_nivel?: string): Promise<CurriculumResult> {
  // paste from lines 956-1002
}
```

### Important
- Export a `types.ts` from `src/lib/ingest/types.ts` for shared types (IngestResult, PageContent, etc.)
- OR keep types in each file and re-export
- documentIngester.ts should become: import all + re-export + `ingestDocument()` stays
- Do NOT change any function signatures — pure extraction

### Verify
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"; npm run build 2>&1; npm run typecheck 2>&1; npx vitest run 2>&1
```

Also verify: All imports from `documentIngester` still resolve → grep for `from.*documentIngester` and check none are broken.

---

## Task 3: Split generator.ts (712L) → slide-type builders (25 min)

### Problem
`src/lib/pptx/generator.ts` is 712 lines with all 12 slide types built in one file. Mixed concerns: slide construction + styling + layout + data transformation. Every slide builder is a separate function but lives in the same file.

### Files
- **TARGET:** `src/lib/pptx/generator.ts`
- **CREATE:** `src/lib/pptx/slides/types.ts` — shared types (COLOR_* constants, FONT_* constants)
- **CREATE:** `src/lib/pptx/slides/cover.ts` — `buildCoverSlide`, `buildCreditsSlide`, `addHeaderSlide`
- **CREATE:** `src/lib/pptx/slides/synthesis.ts` — `buildSynthesisSlides`
- **CREATE:** `src/lib/pptx/slides/abp.ts` — `buildABPSlides`
- **CREATE:** `src/lib/pptx/slides/plan.ts` — `buildPlanSlides`
- **CREATE:** `src/lib/pptx/slides/slides.ts` — `buildSlidesSlides`
- **CREATE:** `src/lib/pptx/slides/ficha.ts` — `buildFichaSlides`
- **CREATE:** `src/lib/pptx/slides/quiz.ts` — `buildQuizSlides`
- **CREATE:** `src/lib/pptx/slides/assessment.ts` — `buildAssessmentSlides`
- **CREATE:** `src/lib/pptx/slides/tutor.ts` — `buildTutorSlides`
- **CREATE:** `src/lib/pptx/slides/pdc.ts` — `buildPDCSlides`
- **CREATE:** `src/lib/pptx/slides/recalibrate.ts` — `buildRecalibrationSlides`
- **CREATE:** `src/lib/pptx/slides/micro.ts` — `buildMicroSlides`

### Pattern
```typescript
// slides/types.ts — shared design tokens
export const FONT_TITLE = 'Bitter';
export const FONT_BODY = 'Calibri';
export const COLOR_BG = '1c1e24';
export const COLOR_ACCENT = '3A9E5E';
export const COLOR_WHITE = 'FFFFFF';
// ... all 12 colors from generator.ts lines 4-18
```

```typescript
// slides/cover.ts
import PptxGenJS from 'pptxgenjs';
import { FONT_TITLE, FONT_BODY, COLOR_BG, COLOR_WHITE, COLOR_ACCENT, COLOR_SUBTLE } from './types';

export function buildCoverSlide(pptx: PptxGenJS, title: string) {
  // paste from generator.ts lines 50-68
}
// ... buildCreditsSlide, addHeaderSlide
```

```typescript
// slides/synthesis.ts
import PptxGenJS from 'pptxgenjs';
import { addHeaderSlide } from './cover';
import { FONT_TITLE, FONT_BODY, COLOR_ACCENT, /* ... */ } from './types';
import type { SynthesisOutput } from '../../../types/motor-types';

export function buildSynthesisSlides(pptx: PptxGenJS, data: SynthesisOutput) {
  // paste from generator.ts lines 97-174
}
```

### Important
- generator.ts becomes: import all builders from `slides/*` + `exportAllMotorsToPPTX()` + legacy functions
- Keep `ExportInput` interface and `exportAllMotorsToPPTX` in generator.ts
- Keep legacy export functions (`exportSlidesToPPTX`, `exportContentToPPTX`) in generator.ts
- Do NOT change any function signatures

### Verify
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"; npm run build 2>&1; npm run typecheck 2>&1; npx vitest run 2>&1
```

Also verify: all generator imports still resolve → `grep -r "from.*pptx/generator" src/`

---

## Task 4: Fix MOTOR_KEYS mismatch (5 min)

### Problem
In `src/hooks/useMotorGeneration.ts` lines 25-26:
```typescript
pdc: 'guia_tutor',
tutor: 'guia_tutor',
```
Both `tutor` and `pdc` map to the same key `'guia_tutor'`. This means when the frontend polls `/api/admin/estado-sistema` for motor status, both motors resolve to the same key. Requesting "PDC" (Plan de Clase Trimestral) could return tutor status data, and vice versa. They will never be independently trackable.

### Why
The `estado-sistema` endpoint (`server/src/routes/admin.ts:10-21`) already uses unique keys for every motor:
```typescript
motors: {
  synthesis: 'idle', abp: 'idle', assessment: 'idle',
  plan: 'idle', slides: 'idle', ficha: 'idle', quiz: 'idle',
  tutor: 'idle', pdc: 'idle', recalibrate: 'idle', micro: 'idle',
},
```
The MOTOR_KEYS mapping should use the same keys as the endpoint — there's no reason to alias `'pdc'` to `'guia_tutor'`.

### Files
- **FIX:** `src/hooks/useMotorGeneration.ts` lines 25-26

### Pattern
```typescript
const MOTOR_KEYS: Record<MotorType, string> = {
  alpha2: 'extraccion_curricular',   // this maps to what estado-sistema returns — verify this exists
  synthesis: 'synthesis',
  abp: 'abp',
  assessment: 'assessment',
  plan: 'plan',
  slides: 'slides',
  ficha: 'ficha',
  quiz: 'quiz',
  pdc: 'pdc',                        // WAS: 'guia_tutor' — FIXED
  tutor: 'tutor',                    // WAS: 'guia_tutor' — FIXED
  recalibrate: 'recalibrate',
  micro: 'micro',
};
```

**NOTE:** Check what key the estado-sistema endpoint actually returns for `alpha2`. It maps to `'extraccion_curricular'` but the endpoint uses motor keys, not display names. If the endpoint doesn't return `'extraccion_curricular'`, fix it to match what the endpoint actually returns.

### Verify
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"; npm run build 2>&1; npx vitest run 2>&1
```

Also verify: no other file maps `'guia_tutor'` → `grep -r "guia_tutor" src/` should return empty.

---

## Task 5: Standardize dbRun returns (5 min)

### Problem
`dbRun` in `server/src/db/schema.ts:34` returns `{ id, rowCount }` (PG convention), but two callers still use the SQLite-era `info.lastInsertRowid` which is `undefined` in the current PG-backed code:

- `server/src/routes/admin.ts:35`: `info.lastInsertRowid` → breaks `POST /api/admin/users` (returns `{ id: undefined }`)
- `server/src/routes/diagnosticos.ts:21`: `info.lastInsertRowid` → breaks `POST /api/diagnosticos` (returns `{ id: undefined }`)

Other callers (`auth.ts:43`, `curriculums.ts:27`, `materials.ts:21`) correctly use `info.id`.

### Files
- **FIX:** `server/src/routes/admin.ts:35`
- **FIX:** `server/src/routes/diagnosticos.ts:21`

### Pattern
```typescript
// admin.ts — line 35, change:
res.json({ data: { id: info.lastInsertRowid, created: new Date().toISOString() } });
// to:
res.json({ data: { id: info.id, created: new Date().toISOString() } });
```

```typescript
// diagnosticos.ts — line 21, change:
res.json({ data: { id: info.lastInsertRowid } });
// to:
res.json({ data: { id: info.id } });
```

### Verify
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"; npm run build 2>&1; npm run typecheck 2>&1; npx vitest run 2>&1
```

Also verify: no remaining `lastInsertRowid` references in server code → `grep -r "lastInsertRowid" server/src/` should return empty.

---

## Completion Criteria
- [ ] `npm run typecheck`: 0 errors
- [ ] `npm run build`: 0 errors
- [ ] `npx vitest run`: 92/92 passing
- [ ] AdminPage.tsx < 100 lines, 5 panels extracted
- [ ] documentIngester.ts split into at least 8 files
- [ ] generator.ts split: slide builders in `slides/*.ts`
- [ ] MOTOR_KEYS: tutor and pdc have unique mappings
- [ ] dbRun: no `lastInsertRowid` references remain
- [ ] No `guia_tutor` references remain in src/
