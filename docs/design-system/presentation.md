# PRIA v10 — Slide Design System

Professional educational slide generator for 5th-grade students and investors.

## Design Philosophy

**Audience**: 5th grade students (10-11 years) + teachers + investors

**Visual Goals**:
- Clean, professional appearance that builds trust with educators and administrators
- Warm, approachable aesthetics that engage young learners
- High contrast for readability in classroom projectors
- Visual hierarchy that guides attention without overwhelming

**Color Strategy**:
- Deep teal (#0F766E) conveys trust, intelligence, and educational authority
- Vibrant coral (#FF6B6B) creates energy and highlights important elements
- Warm white backgrounds (#FAFAF7) reduce eye strain and feel modern
- Subtle shadows and rounded corners add approachability

---

## Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0F766E` | Headers, primary actions, branding |
| `primaryHover` | `#0D9488` | Interactive hover states |
| `accent` | `#FF6B6B` | Highlights, quiz elements, call-to-action |
| `accentAlt` | `#FBBF24` | Secondary highlights, warnings, badges |
| `bg` | `#FAFAF7` | Slide backgrounds |
| `surface` | `#F5F5F0` | Card backgrounds, content areas |
| `border` | `#E5E5E0` | Subtle dividers, card borders |
| `text` | `#1F2937` | Primary text, body copy |
| `textMuted` | `#6B7280` | Secondary text, captions, metadata |
| `textLight` | `#FFFFFF` | Text on dark backgrounds |
| `success` | `#10B981` | Positive feedback, correct answers |
| `warning` | `#F59E0B` | Caution states |
| `error` | `#EF4444` | Error states, incorrect answers |
| `info` | `#3B82F6` | Informational highlights |

### Subject Palettes

| Subject | Primary | Secondary | Accent |
|---------|---------|-----------|--------|
| Matemáticas | `#1E3A5F` | `#FBBF24` | `#3B82F6` |
| Lenguaje | `#0F766E` | `#FF6B6B` | `#F5F5F0` |
| Ciencias Naturales | `#166534` | `#86EFAC` | `#22C55E` |
| Ciencias Sociales | `#4A4A4A` | `#FCD34D` | `#D97706` |
| Historia | `#78350F` | `#FDE68A` | `#B45309` |
| Inglés | `#5B21B6` | `#DDD6FE` | `#A78BFA` |
| Educación Física | `#C7695C` | `#0F766E` | `#5EEAD4` |
| Artes | `#B85C38` | `#FEF3C7` | `#3B82F6` |
| Música | `#0F766E` | `#FBBF24` | `#14B8A6` |
| Religión | `#6B2C3E` | `#FEF3C7` | `#BE185D` |

---

## Typography Scale

| Style | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `coverTitle` | Inter | 44px | Bold | Cover slide main title |
| `coverSubtitle` | Inter | 20px | Normal | Cover slide subtitle |
| `slideTitle` | Inter | 28px | Bold | Section headers |
| `slideTitleSmall` | Inter | 22px | Bold | Compact titles |
| `subtitle` | Inter | 20px | Normal | Section subtitles |
| `body` | Inter | 16px | Normal | Body text, descriptions |
| `bodySmall` | Inter | 14px | Normal | Secondary content |
| `caption` | Inter | 12px | Normal | Metadata, timestamps |
| `pageNumber` | Inter | 10px | Bold | Page number badges |
| `badge` | Inter | 10px | Bold | Small labels |

**Font Stack**: Inter (primary), Arial (fallback), system-ui (ultimate fallback)

---

## Layout Constants

```
Slide: 16:9 format
- Width: 10" (254mm)
- Height: 5.625" (143mm)
- Margins: 0.5" all sides
- Header bar: 0.5" height
- Content area: ~4.125" height
- Card radius: 0.15"
- Page number position: x=9.3", y=5.1"
```

---

## Slide Templates

### 1. Diapositivas (Main Content)

**Purpose**: Core lesson content delivery

**Layout**:
- Teal header bar with slide number + topic badge
- Bold title (28px)
- Content card with main text (shadow, rounded)
- Optional teacher notes section (amber border)

**Elements**:
- Topic badge (coral, rounded)
- Main content card (surface bg, shadow)
- Teacher notes (amber-tinted card)

### 2. Síntesis (Curriculum Synthesis)

**Purpose**: Overview of synthesized curriculum unit

**Layout**:
- Slide 1: Title + enfoque badge + proyecto ABP card
- Slides 2+: Topic breakdown with intelligence badges
- Final slide: DUA adaptations (3-column layout)

**Elements**:
- Enfoque badge (coral)
- ABP project card (surface, shadow)
- Topic slides with intelligence badges (yellow-tinted)
- DUA sections with icons

### 3. Plan de Clase (Lesson Plan)

**Purpose**: Detailed lesson planning for teachers

**Layout**:
- Header with topic + duration
- Objectives section
- Activities timeline
- Materials list
- Assessment criteria

**Elements**:
- Duration badge
- Timeline indicators
- Materials checklist
- Assessment rubric cards

### 4. Quiz (Assessment)

**Purpose**: Knowledge check with multiple choice

**Layout**:
- Coral header (question number + type badge + progress)
- Large question card (centered, shadow)
- 2x2 option grid with letter badges
- Progress indicator

**Elements**:
- Question number badge
- Question type badge (teal)
- Question card (surface, prominent shadow)
- Option cards (white, border, letter badges A-D)

---

## Code Specifications

### File Structure

```
src/lib/pptx/
├── designSystem.ts      # Core design tokens and utilities
├── generator.ts         # Main PPTX generator
├── slides/
│   ├── types.ts         # Export all design tokens
│   ├── cover.ts         # Cover, credits, header slides
│   ├── slides.ts        # Main content slides
│   ├── synthesis.ts     # Curriculum synthesis
│   ├── quiz.ts          # Quiz/assessment
│   ├── plan.ts          # Lesson plan
│   ├── abp.ts           # Project-based learning
│   ├── ficha.ts         # Student worksheet
│   └── ...
└── types.ts             # Shared PPTX types
```

### Key Imports

```typescript
import { FONTS, FONT_SIZES, COLORS, MARGIN, HEADER_H, CONTENT_W, RADIUS } from './slides/types';
import { addHeaderSlide, addPageNumber } from './slides/cover';
```

### Adding a New Slide Type

1. Create file in `src/lib/pptx/slides/[name].ts`
2. Import design tokens from `./types`
3. Import helpers from `./cover`
4. Export function: `export function build[Name]Slides(pptx: PptxGenJS, data: DataType)`
5. Register in `generator.ts`

### Common Patterns

**Header bar**:
```typescript
slide.addShape(pptx.ShapeType.rect, {
  x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
  fill: { color: COLORS.primary },
});
```

**Content card**:
```typescript
slide.addShape(pptx.ShapeType.roundRect, {
  x: MARGIN, y: HEADER_H + 0.3, w: CONTENT_W, h: 2.5,
  fill: { color: COLORS.surface }, rectRadius: RADIUS,
  shadow: { type: 'outer', blur: 4, offset: 2, color: '#000000', opacity: 0.08 },
});
```

**Badge**:
```typescript
slide.addShape(pptx.ShapeType.roundRect, {
  x: 0.9, y: 0.12, w: 1.2, h: 0.26,
  fill: { color: COLORS.accent }, rectRadius: 0.05,
});
slide.addText('Topic', {
  x: 0.9, y: 0.12, w: 1.2, h: 0.26,
  fontSize: 9, fontFace: FONTS.body, bold: true,
  color: COLORS.textLight, align: 'center', valign: 'middle',
});
```

**Page number**:
```typescript
addPageNumber(slide, slideNum);
```

---

## Migration Checklist

### From Legacy Code

- [ ] Replace `COLOR_PRIA_GREEN` with `COLORS.primary`
- [ ] Replace `FONT_TITLE` with `FONTS.title`
- [ ] Update card shadows: `{ type: 'outer', blur: 4, offset: 2, color: '#000000', opacity: 0.08 }`
- [ ] Use `COLORS.bg` for slide backgrounds instead of white
- [ ] Update header bars to use `HEADER_H` constant
- [ ] Replace hardcoded dimensions with `CONTENT_W`, `CONTENT_H`

### New Components

- [ ] Import tokens from `./slides/types`
- [ ] Use `addHeaderSlide()` for standard headers
- [ ] Use `addPageNumber()` on all content slides
- [ ] Apply subject palettes via `getPalette(subject)`

---

## Anti-Patterns

### DO NOT

- ❌ Use `any` type for slide data
- ❌ Hardcode colors outside of `COLORS` object
- ❌ Use `console.log` in production code
- ❌ Create empty slide functions (return early if no data)
- ❌ Skip page numbers on content slides
- ❌ Use excessive shadows (max opacity: 0.1)
- ❌ Stack more than 3 text styles on one element
- ❌ Use images without fallback text
- ❌ Create slides wider than 10" or taller than 5.625"
- ❌ Use non-Inter fonts without fallback

### DO

- ✅ Use `COLORS.primary` for branding consistency
- ✅ Apply `RADIUS` to all cards (0.15")
- ✅ Add teacher notes in amber-tinted cards
- ✅ Use coral (`COLORS.accent`) for quiz/assessment slides
- ✅ Keep 0.5" margins on all sides
- ✅ Use `CONTENT_W` for max text width
- ✅ Export types for all slide data
- ✅ Handle empty data gracefully (return early)

---

## Verification Commands

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Lint
npm run lint
```
