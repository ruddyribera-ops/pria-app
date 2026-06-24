# PRIA v10 — Wizard User Testing Script

## Test Overview

**Goal:** Validate that teachers can complete the 3-step wizard without instruction
**Duration:** 30 minutes per teacher
**Participants:** 3 teachers from Unidad Educativa Las Palmas
**Date:** [TBD]

## Pre-test Setup

For each teacher:
1. Computer with Chrome browser
2. Access to http://localhost:5173
3. PDF file: Texto de lenguaje.pdf on desktop
4. Login credentials provided (admin/admin123)
5. Notebook for observer notes
6. [Screen recording software]

## Observer Role

DO NOT help the teacher. Only observe:
- What they click first
- Where they hesitate
- What confuses them
- What they skip
- When they ask for help
- Their facial expressions
- Comments they make

## Test Script

### Phase 1: Cold Start (5 min)

**Setup:** Log the teacher out. Hand them the keyboard.

**Instructions to teacher (verbatim):**
> "Este es PRIA, una herramienta que te ayuda a crear planes de clase y presentaciones desde tu libro de texto. Empieza cuando quieras."

**Observe:**
- [ ] What does the teacher look at first?
- [ ] Do they explore the sidebar?
- [ ] Do they read the title/subtitle?
- [ ] Do they know where to start?

**Record:** Time to first action: ___ seconds

### Phase 2: First Upload (10 min)

**Instructions:** (none — let them explore)

**If teacher gets stuck after 2 minutes:**
**Probe 1:** "¿Qué estás tratando de hacer?"
**Probe 2:** "¿Qué crees que deberías hacer primero?"

**Observe:**
- [ ] Can they find the upload zone?
- [ ] Do they understand "drag your PDF here"?
- [ ] Do they use drag-drop OR click to browse?
- [ ] Do they understand the progress indicator?
- [ ] Do they know what to do during OCR processing?

**Record:**
- Time to complete upload: ___ minutes
- Errors encountered: ___
- Questions asked: ___

### Phase 3: Topic Selection (10 min)

**Observe:**
- [ ] Do they understand the unit tree structure?
- [ ] Can they expand units?
- [ ] Do they select topics intuitively (which ones, why)?
- [ ] Do they use "select all" or pick individually?
- [ ] Do they understand the topic-type icons (📖 lectura, ✏️ gramática)?
- [ ] Do they read topic names?

**Record:**
- Number of topics selected: ___
- Time to complete selection: ___ minutes
- Topics they said they DIDN'T need: ___

### Phase 4: Generation (5 min)

**Instructions:** (none)

**Observe:**
- [ ] Do they understand the 4 motor cards?
- [ ] Do they read the descriptions?
- [ ] Which one do they click first?
- [ ] Do they wait for generation?
- [ ] Do they know what to do when generation completes?
- [ ] Do they try to download?

**Record:**
- First motor clicked: ___
- Time to first download attempt: ___ minutes
- Confusion points: ___

## Post-Test Interview (10 min)

### Questions to ask

1. **Overall impression:** "Del 1 al 10, ¿qué tan fácil fue usar PRIA?"
2. **Confusion points:** "¿Qué parte te confundió más?"
3. **Missing features:** "¿Qué faltó que esperabas encontrar?"
4. **Time savings:** "Si esto te ahorra tiempo, ¿cuánto tiempo a la semana?"
5. **Willingness to pay:** "¿Pagarías por esto? ¿Cuánto?"
6. **Sharing:** "¿Lo recomendarías a un colega? ¿Por qué sí/no?"
7. **Trust:** "¿Confías en que el contenido generado es correcto?"
8. **Editing:** "¿Modificarías lo que PRIA genera o lo usarías tal cual?"

## Metrics to Track

| Metric | Target | Actual |
|--------|--------|--------|
| Time to first action | <30s | ___ |
| Upload success rate | 100% | ___ |
| Topic selection time | <5min | ___ |
| Generation completion | 100% | ___ |
| Overall ease rating | >7/10 | ___ |
| Would pay | >50% say yes | ___ |
| Would recommend | >50% say yes | ___ |

## Observer Notes Template

For each teacher:

```
Teacher #: ___
Date: ___
Time started: ___

PHASE 1 (Cold Start):
- First action: ___
- Time: ___s
- Notes: ___

PHASE 2 (Upload):
- Time to find upload: ___s
- Drag-drop or browse?: ___
- Errors: ___
- Time to complete: ___min
- Notes: ___

PHASE 3 (Topic Selection):
- Topics selected: ___
- Total topics available: ___
- Time: ___min
- Hesitations: ___
- Notes: ___

PHASE 4 (Generation):
- First motor: ___
- Wait behavior: ___
- Download attempts: ___
- Notes: ___

POST-TEST INTERVIEW:
Q1 (ease): ___/10
Q2 (confusion): ___
Q3 (missing): ___
Q4 (time savings): ___
Q5 (willing to pay): ___
Q6 (recommend): ___
Q7 (trust): ___
Q8 (editing): ___

KEY INSIGHTS:
1. ___
2. ___
3. ___
```

## Success Criteria

POA assumes success if:
- [ ] 3/3 teachers complete the wizard
- [ ] Average ease rating >6/10
- [ ] Average time to upload <5 min
- [ ] At least 1/3 says would pay $50+ USD/month
- [ ] At least 1/3 says would recommend to colleagues

## After Testing

1. Compile notes into a single report
2. Identify top 3 issues
3. Prioritize fixes for next iteration
4. Plan follow-up testing in 2 weeks after fixes
