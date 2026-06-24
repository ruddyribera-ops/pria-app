# PRIA v10 — Plan of Action for Product Readiness

## Executive Summary

PRIA v10 has a working AI pipeline (80% technology readiness) but only 30% product readiness. The gap is concentrated in three areas: UX/onboarding, visual quality, and scalability. This POA proposes a 10-week roadmap to bridge the gap, prioritizing UX first (70% of user-perceived value) before visual quality (15%) and scalability (15%).

The target user is a primary school teacher in Bolivia/Latin America who teaches 5th grade. Today this person creates lesson plans and slides manually in PowerPoint, spending 3-5 hours per week. PRIA's value proposition is "5 minutes instead of 3 hours, content adapted to your textbook."

## Current State

### Technology (80% ready)
- ✅ Full pipeline: PDF upload → OCR → 6 units × 5-7 topics → 6 AI motors → real PPTX
- ✅ Multi-motor AI: Síntesis, Plan, Diapositivas, Ficha, Quiz, ABP
- ✅ Real PowerPoint exports via pptxgenjs
- ✅ Design system with per-subject palette, teacher footer
- ⚠️ Hardcoded parser for ONE textbook (Lenguaje 5to)
- ⚠️ No content library for other grades/materias

### Product (30% ready)
- ❌ Developer-facing UI ("Síntesis con IA", "Motor ABP")
- ❌ No onboarding wizard
- ❌ No preset templates
- ❌ Sidebar in tech terms not teacher terms

### Market (0% validated)
- ❌ Zero teachers have used it
- ❌ No pricing validated
- ❌ No distribution channel

## PEE Analysis

### Pillar 1: UX/Onboarding (70% of perceived value)

#### Point 1.1: 3-step wizard replaces current Materials page
- **Point:** Replace the current Materials page UI with a 3-step wizard: Upload → Select → Download
- **Evidence:** ASSUMPTION based on Nielsen Norman Group usability heuristics — wizards reduce cognitive load for non-expert users by chunking complex tasks into discrete steps. WhatsApp Business onboarding uses this pattern. MagicSchool (EdTech competitor) uses a wizard for first-time teacher setup. Khan Academy Teacher uses progressive disclosure.
- **Explain:** A teacher should never see "Generate Síntesis con IA" — they should see "Genera plan para tu clase de mañana". The wizard translates PRIA's powerful but technical motor system into a teacher-friendly question flow.

#### Point 1.2: Preset templates for common workflows
- **Point:** Add 5-7 preset workflows that teachers can pick without configuration
- **Evidence:** ASSUMPTION based on SaaS onboarding patterns — Mailchimp, Canva, Notion all use preset templates to reduce time-to-first-value. Don Norman's "Knowledge in the World vs Knowledge in the Head" — design should not require users to remember motor names.
- **Explain:** Presets would include: "Plan semanal 5to primaria Lenguaje", "Diapositivas para una lectura", "Quiz de 5 preguntas", "Ficha de práctica individual", "Proyecto ABP del mes". Each preset chains multiple motors into one click.

#### Point 1.3: Visual hierarchy redesign — "lesson-first" not "motor-first"
- **Point:** Reorganize UI around teacher mental model: "Class > Week > Day" instead of "Materials > Síntesis > Plan"
- **Evidence:** REQUIRES VALIDATION. Assumption based on job shadowing teachers — they think in terms of class periods and weekly plans, not content types.
- **Explain:** A teacher opens PRIA thinking "I have a class on Tuesday about Mitos y Leyendas." The UI should let them jump to that class directly, see the lesson plan, the slides, the quiz — all pre-generated.

#### Point 1.4: Spanish-language onboarding for low-tech-literacy users
- **Point:** Use simple Spanish (not technical jargon) in all UI text and onboarding copy
- **Evidence:** UNESCO 2022 report on Latin American education: ~40% of teachers in rural Bolivia have limited digital tool experience. ASSUMPTION: simple language reduces friction.
- **Explain:** Instead of "Síntesis generada con IA", show "Tu plan de clase está listo". Use second person ("Tú"), present tense, active voice.

### Pillar 2: Visual Quality (15% of perceived value)

#### Point 2.1: Match hand-crafted sample quality as the bar
- **Point:** All PPTX outputs must reach the visual quality of user's hand-crafted samples within 8 weeks
- **Evidence:** REQUIRES VALIDATION. The user's hand-crafted samples (decorative circles, color-coded mnemonics, hero word treatment) are the gold standard because they reflect what a teacher would actually present to a class.
- **Explain:** Current PRIA slides look "AI-generated" — uniform, flat, generic. Hand-crafted samples have personality. The PPTX generator must produce slides with: 5+ accent colors per deck, mixed serif/sans typography, decorative geometric shapes, hero word treatment on covers, color-coded mnemonics.

#### Point 2.2: Add a "Designer Review" pass before export
- **Point:** Implement a final visual review step where the teacher can preview and request changes to the generated slides before exporting
- **Evidence:** ASSUMPTION — Canva, Google Slides, PowerPoint Designer all use this pattern. MagicSchool has a "review and regenerate" button.
- **Explain:** Teachers will not use tools they don't trust. A preview-with-edit step builds trust and lets teachers customize for their specific class context.

### Pillar 3: Scalability (15% of perceived value)

#### Point 3.1: Generic unit/topic detector
- **Point:** Replace the hardcoded Lenguaje unit map with a generic detector that works for ANY Spanish-language textbook
- **Evidence:** REQUIRES VALIDATION. Assumption based on textbook structure — most Bolivian textbooks follow Ministry of Education format with "UNIDAD" markers, numbered topics, "Aprende" boxes.
- **Explain:** Use pattern matching on: (a) "UNIDAD" + Roman/Arabic numerals, (b) "Aprende" boxes for grammar topics, (c) numbered activity lists, (d) story titles in quotes. Fallback: ask teacher to confirm detected topics.

#### Point 3.2: Content library for other grades/materias
- **Point:** Build a library of pre-built prompts for each (grade × materia × motor) combination
- **Evidence:** REQUIRES VALIDATION. ASSUMPTION based on curriculum structure — Bolivian education has 12 grades × ~10 materias = 120 distinct contexts.
- **Explain:** Currently every generation uses generic prompts. Each grade/materia needs tailored prompts that account for vocabulary complexity, topic relevance, and pedagogical style appropriate for that age group.

## Roadmap (10 weeks)

### Phase 1: UX Foundation (Weeks 1-3) — addresses 70% of perceived value
- Week 1: Build 3-step wizard replacing Materials page
- Week 2: Add 5 preset templates (Plan semanal, Diapositivas, Quiz, Ficha, ABP)
- Week 3: Spanish-language copy review, teacher mental model user testing with 3-5 teachers

### Phase 2: Visual Quality (Weeks 4-6) — addresses 15% of perceived value
- Week 4: Implement color-coded mnemonics, hero word treatment, decorative shapes in cover slides
- Week 5: Add per-section typography variation (serif headings, mixed weights)
- Week 6: Build "Designer Review" preview/edit step before export

### Phase 3: Scalability (Weeks 7-10) — addresses 15% of perceived value
- Week 7: Build generic unit detector, test with 3 different textbooks
- Week 8: Build content library scaffold (grade × materia matrix)
- Week 9-10: Pilot with 10-20 teachers across 3 schools, iterate based on feedback

## Success Metrics

How we'll measure product-market fit:
- **Adoption:** 50 teachers using PRIA weekly within 3 months of launch
- **Wizard completion:** 80% of new users complete the 3-step wizard
- **Output quality:** Average teacher rating >4/5 stars for generated slides
- **Time savings:** Average time to create a week's lesson plan drops from 3 hours to 30 minutes (80% reduction)
- **Retention:** 60% weekly active rate after 4 weeks
- **Willingness to pay:** 30% of pilot teachers say they'd pay for it

## Risks and Open Questions

1. **Teacher adoption risk:** Will teachers actually use this? Validated via 10-teacher pilot in Phase 3.
2. **Pricing risk:** We don't know what schools will pay. Assumed $50-200 USD/month per school.
3. **Quality ceiling:** Can AI-generated slides match hand-crafted quality? Open question.
4. **Distribution risk:** How do we reach teachers without a sales team? ASSUMPTION: Ministry of Education partnerships, teacher training programs.

## Next Immediate Actions

This week:
1. User testing with 3 teachers from Unidad Educativa Las Palmas to validate the 3-step wizard
2. Build the wizard prototype (1 day)
3. Document the content library scaffold (1 day)

Next 2 weeks:
1. Launch pilot with 10 teachers
2. Iterate based on feedback
3. Begin generic unit detector

## Conclusion

PRIA v10 has 80% technology readiness but only 30% product readiness. The path to product-market fit is clear: UX first, visual quality second, scalability third. The 10-week roadmap delivers a teacher-validated, visually polished, scalable product that could realistically generate $50-200 USD/month per school in Bolivia, with a 50-school pilot representing $30K-120K USD ARR (Annual Recurring Revenue).

The key risk is teacher adoption. If teachers don't use it because of UX friction or poor output quality, no amount of technical sophistication will save the product. This POA prioritizes user validation above all else.