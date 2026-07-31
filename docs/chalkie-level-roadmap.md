# PRIA v10 → Chalkie AI Level — Roadmap POA

**Goal:** Bring PRIA v10 slide generation to feature parity with Chalkie AI's "edit before download" workflow.

**Current state:** PPTX generated correctly (verified 268KB file, 12 slides). Quality scoring and cultural sensitivity both working. **Gap:** no editor — user receives PPTX "as-is" with no chance to edit before download.

**Source of comparison:** https://www.chalkie.ai/ (reviewed 2026-07-01)

## Gap analysis (Chalkie vs PRIA)

| Feature | Chalkie AI | PRIA v10 | Status |
|---------|-----------|----------|--------|
| Generate slides from prompt | ✅ | ✅ | — |
| Cover with docente metadata | ✅ | ✅ | BUG-005 fix |
| Type badges + numbering | ✅ | ✅ | — |
| Prompt variations for images | ✅ (one-click) | ✅ (ImagePromptCard) | — |
| **Edit text inline** | ✅ rich text editor | ❌ | **GAP** |
| **Add/remove slides** | ✅ drag-drop | ❌ | **GAP** |
| **Reorder slides** | ✅ drag-drop | ❌ | **GAP** |
| **Regenerate single slide** | ✅ ("make it fun") | ❌ | **GAP** |
| **Theme switcher** | ✅ 1-click | ❌ single theme | **GAP** |
| **AI quick edits** | ✅ ("more fun", "simpler") | ❌ | **GAP** |
| **Differentiate for DUA** | ✅ built-in | ⚠️ only with diagnosticos | partial gap |
| **Export to PPT/Google/PDF** | ✅ all three | ✅ all three | — |
| **Standards alignment** | ✅ (Common Core, state) | ❌ | **GAP** |

## POA — Prioritized tasks (sequenced for incremental value)

### Phase 1: Slide Editor (HIGH IMPACT, 2-3 days)
1. **T1: Inline text editor for individual slides** (4h)
   - File: new `src/components/Slides/SlideEditorPanel.tsx`
   - Click on any text field (titulo, texto_pantalla, guion_docente, callout) → becomes editable
   - Save button persists to backend via new endpoint `PATCH /api/motor_results/:id`
   - Existing: `SlideEditorPanel.tsx` exists but no inline editing
2. **T2: Add/remove slides** (2h)
   - Buttons "+ Add slide" / "- Remove" per slide
   - "Add" prompts for tipo (portada/objetivos/concepto/pausa/cierre)
   - Local-only (no backend), persisted on download
3. **T3: Reorder slides** (4h)
   - Drag-and-drop with dnd-kit or react-dnd
   - Updates slide.numero on reorder

### Phase 2: Per-slide AI actions (HIGH IMPACT, 1-2 days)
4. **T4: Regenerate single slide with feedback** (6h)
   - Button "Regenerar esta slide" on each slide
   - Modal: text input for feedback ("más simple", "más divertido", "agregar ejemplo")
   - Backend: new endpoint `POST /api/motores/slides/regenerate-slide` that calls LLM with original content + delta
5. **T5: AI quick edit buttons** (4h)
   - Pre-defined buttons: "Simplificar", "Agregar ejemplo", "Más divertido", "Hacer más serio"
   - Uses same endpoint as T4 with predefined feedback
6. **T6: DUA differentiation** (3h)
   - If diagnosticos exist, button "Crear versión adaptada" generates 3 slide variants (TDAH, TEA, Dislexia)
   - Each variant is a separate sub-slide or alternative version

### Phase 3: Theme + Polish (MEDIUM IMPACT, 1 day)
7. **T7: Theme switcher** (3h)
   - Pre-defined themes: Codecademy (default), Oscuro, Minimalista, Escolar-Tradicional
   - Each theme = different color palette + font
   - Stored in slide builder config
8. **T8: Standards alignment** (4h)
   - Add Curriculo Base Boliviano (Lenguaje, Ciencias Sociales, Matemáticas) lookup
   - Embed in slide footer or in metadata
9. **T9: Quality score becomes gating** (2h)
   - Slides with quality < 60 can't be downloaded (forced regenerate)
   - Show quality badge in editor

### Phase 4: Backend + Polish (LOW EFFORT, 1-2 days)
10. **T10: Real PATCH endpoint for slides** (3h)
    - `PATCH /api/motores/slides/:id` saves edited content to DB
    - Required for T1, T2, T3, T4 to persist
11. **T11: Regenerate-single-slide backend** (4h)
    - New endpoint that takes slide N + feedback, calls LLM, returns updated slide
    - Required for T4, T5
12. **T12: DUA generation backend** (3h)
    - Per-diagnostico variant generation
    - Required for T6

## Effort estimate

| Phase | Tasks | Total hours |
|-------|-------|-------------|
| Phase 1 (Slide Editor) | T1, T2, T3 | 10h |
| Phase 2 (AI Actions) | T4, T5, T6 | 13h |
| Phase 3 (Theme + Polish) | T7, T8, T9 | 9h |
| Phase 4 (Backend) | T10, T11, T12 | 10h |
| **Total** | **12 tasks** | **~42h = 1-2 weeks of focused work** |

## Quick wins (do first, ship fast)

If user wants immediate value:
- **T1 + T2 + T10 only** = inline editor + add/remove + PATCH endpoint = 9h
- After that, user can already edit and download custom PPTX

## Stretch goals (post-Chalkie parity)

- **Multi-language support** — auto-detect language, generate in user's preferred
- **Voice narration** — text-to-speech for each slide
- **Quiz integration** — auto-add quiz at end of slide deck
- **Collaborative editing** — multiple teachers co-edit deck
- **Version history** — git-like diff for slide evolution
- **AI feedback loop** — teachers rate slides, system learns what works
- **LMS export** — direct integration with Google Classroom, Moodle, Schoology
- **Standards bank** — pre-built slide templates by country/grade/subject

## Risks

- **Prompt length regression**: if T4 (regenerate single slide) is implemented without re-enforcing length limits, quality score will drop to 0 again
- **DUA hallucination**: T6 could generate culturally inappropriate content if not protected by the cultural sensitivity trigger
- **Theme switching**: changing color palette mid-deck could break visual coherence
- **Editor performance**: re-rendering all slides on every keystroke could be slow with 10+ slides

## Success criteria (vs Chalkie)

After implementing Phases 1-4:
- Teacher can edit each slide's text inline ✅
- Teacher can add/remove/reorder slides ✅
- Teacher can regenerate individual slide with feedback ✅
- Teacher can change theme ✅
- Quality score is gating (must be ≥60 to download) ✅
- DUA variants available if diagnosticos present ✅
- Export to PPT/Google/PDF works ✅

This is feature parity with Chalkie's "edit before download" workflow at $0 cost (no image API).
