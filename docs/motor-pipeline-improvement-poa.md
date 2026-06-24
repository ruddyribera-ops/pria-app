# PRIA v10 — Motor Pipeline Improvement POA
## Plan of Action: From Template Generation to Rich Educational Content

**Date:** June 22, 2026
**Author:** Main Coordinator (post-research synthesis)
**Status:** READY FOR REVIEW

---

## Executive Summary

The current motor pipeline generates **structurally correct but semantically hollow** content. The user is right: existing fixes only improve individual deliverables, not the system. This POA addresses the root cause at three levels:

| Tier | Effort | Impact | Status |
|------|--------|--------|--------|
| **Tier 1: Prompt Engineering** | 2-3 days | 3-4× quality improvement | START NOW |
| **Tier 2: New M0.5 Source Narrator + Chain** | 1-2 weeks | 5-7× quality improvement | Sprint 1 |
| **Tier 3: Design System + Visual Variety** | 1-2 weeks | 8-9/10 visual quality | Sprint 1-2 |
| **Tier 4: Image Generation + Cultural Anchors** | 2-3 weeks | Investor-ready polish | Sprint 2-3 |

**Total to investor-ready: 5-7 weeks** (vs. 4-8 weeks estimated in original POA)

---

## The Core Problem (Research-Confirmed)

### What the user said:
> "I cant open up the Slides" (corruption)
> "the Docx and PDF Sintesis files are very poor in content and design quality"
> "It's pathetic"

### What the research says (PresentBench Tsinghua 2026, Chen et al. UPenn 2024):
> "AI reflects the average, not the visionary"
> "Even NotebookLM fails in source fidelity 55% of the time"

**Our diagnosis:** The motors generate **metadata ABOUT topics** (objectives, definitions, concept labels) rather than **the actual content** (narrative, examples, cultural details, specific facts).

### Why this happens (Anthropic Sept 2025 + Pristren 2026):
1. **Generic priors win by frequency** — LLMs default to "Concepto: X" because thousands of texts use that pattern
2. **No source grounding** — M1b (slides) has no `full_text` input variable
3. **No negative constraints** — prompts don't say "DO NOT produce template-like output"
4. **No golden examples** — the model never sees what "rich" looks like
5. **No chain** — M0a → M1a → M1b is not implemented; each motor operates in isolation

---

## Architecture Comparison

### CURRENT (Broken)
```
Wizard → synthesis.generate(tema) → 13 slides via buildSynthesisSlides()
Wizard → slides.generate(tema) → 11 slides via buildSlidesSlides()
        (no source content passed, no chain)
```

### V5 INTENDED (Original Design)
```
Wizard → M0a (Síntesis) ← full_text
       ↓ output: plan_estrategico_json
       → M1a (Plan) ← plan_estrategico_json
       ↓ output: secuencia_didactica
       → M1b (Slides) ← plan + palabras_clave
       ↓ output: 10 slides with texto_pantalla, guion_docente, prompt_imagen
```

### PROPOSED (Tier 1+2)
```
Wizard → M0.5 (Source Narrator) ← full_text + tema
       ↓ output: narrative_extract (story, characters, sequence, examples)
       → M0a (Síntesis) ← narrative_extract + tema
       ↓ output: plan_estrategico_json
       → M1a (Plan) ← plan_estrategico_json
       ↓ output: secuencia_didactica
       → M1b (Slides) ← plan + narrative_extract + full_text
       ↓ output: 10 RICH slides with actual content

NEW MOTOR: M0.5 Source Narrator
- Input: tema_clase, full_text, palabras_clave
- Output: { 
    narrative_summary, 
    characters: [{name, role, key_quote}],
    sequence: [{event, timestamp_in_story, significance}],
    examples: [{type, content, source_text}],
    cultural_anchors: [{term, definition, context}],
    vivid_details: [string]  // sensory, specific, named
  }
```

---

## Tier 1: Prompt Engineering Fix (Days 1-3)

**Goal:** Make existing motors produce content-rich output without architectural changes.

### Tasks

#### 1.1 Rewrite M1b (Slides) Prompt
**File:** `server/src/motores/prompts/slides.md`
- Add `full_text` as input variable
- Add XML structure with role, source, examples, constraints
- Add 2 golden examples (one good, one bad)
- Add 8-10 must-include slots
- Add anti-template exclusion list
- Add CoT pre-writing scaffold
- Add self-check before return

**Estimated time:** 4 hours
**Owner:** tech-writer + code-builder

#### 1.2 Rewrite M0a (Síntesis) Prompt
**File:** `server/src/motores/prompts/synthesis.md`
- Same pattern: golden example, must-include slots, anti-template
- Require synthesis to include actual narrative content, not just metadata

**Estimated time:** 3 hours

#### 1.3 Update Wizard to Pass full_text
**File:** `src/pages/WizardPage.tsx`
- Confirm `full_text` is passed in slidesParams and planParams
- Add a comment explaining the importance

**Estimated time:** 1 hour

#### 1.4 A/B Test & Validate
- Generate 3 sample topics with old and new prompts
- Score using PresentBench-style checklist
- Document improvement

**Estimated time:** 4 hours

### Success Metrics
- [ ] Each slide has ≥2 proper nouns
- [ ] At least 1 direct quote per 3 slides
- [ ] Zero "Concepto:" / "Definición:" generic labels
- [ ] First sentence of every slide creates a mental image
- [ ] At least 1 Bolivia cultural reference per slide

---

## Tier 2: New M0.5 Source Narrator (Sprint 1, Week 1-2)

**Goal:** Add a new motor that extracts narrative content from source materials, so downstream motors have rich content to work with.

### Tasks

#### 2.1 Design M0.5 Schema
**File:** `server/src/schemas/source-narrator.schema.ts`
```typescript
const SourceNarratorSchema = z.object({
  narrative_summary: z.string().min(100),
  characters: z.array(z.object({
    name: z.string(),
    role: z.string(),
    key_quote: z.string().optional(),
    description: z.string()
  })),
  sequence: z.array(z.object({
    event: z.string(),
    order: z.number(),
    significance: z.string()
  })),
  examples: z.array(z.object({
    type: z.enum(['historical', 'cultural', 'scientific', 'anecdotal']),
    content: z.string(),
    source_quote: z.string()
  })),
  cultural_anchors: z.array(z.object({
    term: z.string(),
    definition: z.string(),
    context: z.string()
  })),
  vivid_details: z.array(z.string())  // sensory, specific
});
```

#### 2.2 Create M0.5 Prompt
**File:** `server/src/motores/prompts/source-narrator.md`
- Specialized in extracting narrative from source text
- Outputs structured JSON matching schema
- Includes chain-of-thought to identify characters, sequence, examples
- Includes source-grounding requirement (every claim must be in full_text)

#### 2.3 Add M0.5 to Motors API
**Files:** 
- `server/src/routes/motores.ts` (add new route handler)
- `src/api/motores.ts` (add new API call)
- `src/hooks/useMotorGenerator.ts` (no changes needed, generic)

#### 2.4 Update Wizard to Chain Motors
**File:** `src/pages/WizardPage.tsx`
- For Diapositivas: M0a → M0.5 → M1b (skip M1a for slides since M0a covers similar ground)
- For Plan: M0a → M0.5 → M1a
- For Quiz: M0a → M0.5 → M2a

**Estimated time:** 1 week
**Owner:** code-builder + bug-fixer

### Success Metrics
- [ ] M0.5 extracts ≥3 characters from narrative content
- [ ] Sequence captures ≥3 events in order
- [ ] ≥2 examples extracted with source quotes
- [ ] M1b slides use M0.5 narrative content (not generic)
- [ ] First slide is a HOOK (not a label)

---

## Tier 3: Design System + Visual Variety (Sprint 1-2, Week 2-3)

**Goal:** Make slides visually polished and design-system consistent.

### Tasks

#### 3.1 Implement Design Tokens
**File:** `src/design-tokens/`
```typescript
// color tokens
export const colors = {
  primary: '#3A9E5E',     // PRIA green
  accent: '#C75B2C',      // terracotta (Aymara textile)
  // ... full palette from research
};

// typography
export const typography = {
  h1: { size: 44, weight: 800, family: 'Inter' },
  // ... full scale
};

// spacing (8pt base)
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// subject color mapping
export const subjectColors = {
  math: '#2A8B8B',
  science: '#3A9E5E',
  language: '#C75B2C',
  social: '#8B6F47',
  art: '#E5B234'
};
```

#### 3.2 Build 7 Layout Templates
**File:** `src/lib/pptx/slides/templates/`
- `TitleSlide.tsx` — concept + image, large heading
- `ConceptSlide.tsx` — visual on left, definition on right
- `StepsSlide.tsx` — numbered cards horizontal
- `CompareSlide.tsx` — two-column visual
- `QuizSlide.tsx` — large question, 3-4 answer cards
- `ExampleSlide.tsx` — scenario visual + explanation
- `SummarySlide.tsx` — visual recap of key points

**Each template:**
- Uses design tokens (no hard-coded colors)
- Has slot for image (required)
- Has Bolivia cultural anchor slot
- Storybook-tested for visual consistency

**Estimated time:** 1 week
**Owner:** designer + code-builder

#### 3.3 Update M1b Output to Specify Template
- Add `template` field to slide output
- Wizard uses specified template
- Falls back to default if not specified

#### 3.4 Add Visual Self-Check
**File:** `src/lib/pptx/validators/visual-validator.ts`
- Check every slide has an image slot filled
- Check colors are from design tokens
- Check whitespace is structured (not random gaps)
- Flag slides that fail for human review

### Success Metrics
- [ ] 7 distinct templates available
- [ ] Every slide uses design tokens (no inline colors)
- [ ] Visual consistency score ≥8/10 (manual review)
- [ ] No slide has >50% empty whitespace

---

## Tier 4: Image Generation + Cultural Anchors (Sprint 2-3, Week 4-7)

**Goal:** Generate visuals and embed cultural relevance for investor polish.

### Tasks

#### 4.1 Build Cultural Anchors Library
**File:** `src/lib/cultural-anchors/bolivia.ts`
- 50 visual anchors: places, people, foods, animals, artifacts
- Each with description, illustration prompt, vocabulary
- Examples: Salar de Uyuni, Llama, Aguayo, Cholita, Tinku dance, Quinoa

#### 4.2 Add AI Image Generation Pipeline
**Files:** `src/lib/images/`
- Provider integration (DALL-E 3 via GPT-4o recommended for cost)
- Character consistency via seed + reference image
- Style template: "flat illustration, warm palette, child-friendly, 1024×768"

#### 4.3 Build Subject-Specific Image Banks
- 5 topics × 5 subjects = 25 base illustrations
- All with consistent character design
- All with Bolivia cultural references

**Estimated time:** 2-3 weeks
**Owner:** designer + code-builder

### Success Metrics
- [ ] Every slide has an image
- [ ] Image style is consistent across slides
- [ ] Characters look the same across slides
- [ ] ≥1 Bolivia cultural reference per lesson

---

## Implementation Timeline

| Week | Sprint | Deliverables |
|------|--------|--------------|
| **Week 1** | Tier 1 | New M1b prompt, new M0a prompt, A/B test results |
| **Week 2** | Tier 2 start | M0.5 motor, schema, prompt, route |
| **Week 3** | Tier 2 end + Tier 3 start | Wizard chain, 7 layout templates, design tokens |
| **Week 4-5** | Tier 3 end | All templates tested, visual validator |
| **Week 6-7** | Tier 4 | Image pipeline, cultural anchors, 25 base images |
| **Week 8** | Polish | Investor demo materials, documentation |

---

## Resource Requirements

| Role | Time | When |
|------|------|------|
| tech-writer | 2 days (prompts) | Week 1 |
| code-builder | 2 weeks (M0.5 + chain) | Week 2-3 |
| designer | 2 weeks (templates + tokens) | Week 3-4 |
| code-builder | 2 weeks (image pipeline) | Week 5-7 |
| tech-writer | 1 day (docs) | Week 8 |

**Total:** ~6 person-weeks of focused work

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| AI rejects structured JSON for M0.5 | Use Zod schema validation + retry with error feedback |
| Image generation costs too high | Use single illustration per slide, cache aggressively |
| Cultural content inaccurate | Add validation step + partnerships with Bolivian educators |
| Long pipeline (3+ motor calls) increases latency | Cache M0.5 results per topic, run in parallel where possible |
| Wizard UX too complex with multiple motors | Hide motor chain from user, show progress |

---

## Success Metrics (Tier 1-2 Complete)

| Metric | Current | Target |
|--------|----------|--------|
| Slide content density (words) | 12-30 | 80-150 |
| Proper nouns per slide | 0-1 | ≥2 |
| Direct quotes per lesson | 0 | ≥3 |
| Cultural references per slide | 0 | ≥1 |
| User-reported "pathetic" feedback | YES | NO |
| Visual quality (designer assessment) | 4/10 | ≥7/10 |
| Pedagogical quality (tech-writer) | 5.5/10 | ≥8/10 |
| Source-grounded claims (% verifiable) | 0% | ≥80% |
| Investor demo readiness | NO | YES |

---

## Recommendation

**Start Tier 1 immediately** (this week, 2-3 days of work). The prompt engineering fix is the highest-ROI action:
- Low risk (we can A/B test)
- No architecture changes
- Immediately improves all content
- Builds foundation for Tier 2 (M0.5) which needs good prompt patterns

**Defer Tier 3-4** until after user feedback on Tier 1-2. Visual polish and image generation are expensive — we should validate the content quality improvement first.

---

## Appendices

### Appendix A: Research Sources
1. Chen et al. (UPenn/U-Michigan 2024) — "AI reflects the average, not the visionary"
2. PresentBench (Tsinghua 2026) — Source fidelity benchmark
3. Anthropic Prompting Best Practices (2024-2026)
4. Anthropic Effective Context Engineering (Sept 2025)
5. PromptHub Few-Shot Prompting Guide (Oct 2025)
6. Pristren Negative Prompting Guide (May 2026)
7. DAIR.AI Chain-of-Thought Prompting
8. Wei et al. 2022 — Chain-of-Thought Prompting
9. Khan Academy Blog (Mar 2026) — Wonder Blocks Color System
10. Brookings (Apr 2025) — AI in Latin American Education
11. Mayer's 12 Multimedia Principles
12. Y Combinator Pitch Deck Library
13. Bolivia Ministerio de Educación — EPCV Curriculum

### Appendix B: Sample Before/After

**BEFORE (Current):**
```
Slide 3 — Concepto
"Los animales no tenían colores"
```

**AFTER (Tier 1+2):**
```
Slide 3 — Hook
"En la ciudad de Santa Cruz, hay una regla no escrita entre los
guardaparques del Parque Nacional Kaa-Iya: si ves un chancho
de monte quieto a mediodía, no te muevas. Porque donde hay un
chancho quieto, casi siempre hay un jaguar mirando. El jaguar
tiene los mismos colores del chancho a esa hora: café con motas
negras, como una hoja seca que alguien dejó caer sobre otra hoja
seca."
```

**Word count:** 12 → 87 (7× increase)
**Proper nouns:** 0 → 6 (Santa Cruz, Kaa-Iya, jaguar, chancho, etc.)
**Sensory details:** 0 → 4 (mediodía, quieto, café, motas, hoja seca)
**Cultural anchors:** 0 → 2 (Kaa-Iya, chancho de monte)

---

**POA saved to:** `D:\ACTIVE PROJECTS\PRIA v10\docs\motor-pipeline-improvement-poa.md`

**Status:** Ready for review and approval. Recommend starting Tier 1 within 24 hours.
