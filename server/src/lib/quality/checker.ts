// server/src/lib/quality/checker.ts
// PURE function: no I/O, no DB, no LLM calls.
// Takes motor output and returns quality score with flags and suggestions.

export interface QualityFlag {
  code: string;  // e.g., "TEXT_TOO_LONG", "MISSING_METADATA"
  severity: 'high' | 'medium' | 'low';
  field?: string;
  message: string;
}

export interface QualityScore {
  overall: number;  // 0-100
  flags: QualityFlag[];
  suggestions: string[];  // actionable improvements
}

// ─── Placeholder detection patterns ───────────────────────────────────────────
const PLACEHOLDER_PATTERNS = [
  /Tema de ejemplo/gi,
  /Lorem ipsum/gi,
  /\[MOCK\]/gi,
  /\[PLACEHOLDER\]/gi,
  /Imágen generada/gi,  // sic: intentional typo from spec
];

// ─── Cultural sensitivity patterns ───────────────────────────────────────────
const INDIGENOUS_GROUP_PATTERNS = /ayoreo|quechua|aymara|guaran[ií]|chiquitano|mojeño/i;
const GENERIC_CULTURAL_PATTERNS = /tribal|indigenous shaman|generic indigenous culture/i;

// ─── Helper: collect all string fields recursively ─────────────────────────────
function collectStrings(obj: unknown, path = ''): Array<{ value: string; path: string }> {
  const results: Array<{ value: string; path: string }> = [];
  if (typeof obj === 'string') {
    results.push({ value: obj, path });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      results.push(...collectStrings(item, `${path}[${i}]`));
    });
  } else if (obj && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      results.push(...collectStrings(val, path ? `${path}.${key}` : key));
    }
  }
  return results;
}

// ─── Helper: get nested value by path ────────────────────────────────────────
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((cur: unknown, key) => {
    if (cur && typeof cur === 'object' && key in cur) {
      return (cur as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ─── Check 1: Cognitive load ──────────────────────────────────────────────────
function checkCognitiveLoad(output: unknown, type: string): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const strings = collectStrings(output);

  if (type === 'slides' && Array.isArray(output)) {
    for (const slide of output as Record<string, unknown>[]) {
      const textoPantalla = slide.texto_pantalla as string | null | undefined;
      if (textoPantalla && textoPantalla.length > 400) {
        flags.push({
          code: 'TEXT_TOO_LONG',
          severity: 'medium',
          field: `slide${slide.numero}.texto_pantalla`,
          message: `texto_pantalla has ${textoPantalla.length} chars (max 400) — reduce cognitive load`,
        });
      } else if (textoPantalla && textoPantalla.length > 300) {
        flags.push({
          code: 'TEXT_SLIGHTLY_LONG',
          severity: 'low',
          field: `slide${slide.numero}.texto_pantalla`,
          message: `texto_pantalla has ${textoPantalla.length} chars (recommended max 300)`,
        });
      }
      // TEXT_DENSE: penalize slides with too much text (catches dense slides)
      if (textoPantalla && textoPantalla.length > 200) {
        flags.push({
          code: 'TEXT_DENSE',
          severity: 'medium',
          field: `slide${slide.numero}.texto_pantalla`,
          message: `texto_pantalla has ${textoPantalla.length} chars (> 200) — visual density too high, consider splitting or using diagrams`,
        });
      }
      const guion = slide.guion_docente as string | null | undefined;
      if (guion && guion.length > 500) {
        flags.push({
          code: 'GUION_TOO_LONG',
          severity: 'low',
          field: `slide${slide.numero}.guion_docente`,
          message: `guion_docente has ${guion.length} chars (max 500)`,
        });
      } else if (guion && guion.length > 350) {
        flags.push({
          code: 'GUION_SLIGHTLY_LONG',
          severity: 'low',
          field: `slide${slide.numero}.guion_docente`,
          message: `guion_docente has ${guion.length} chars (recommended max 350)`,
        });
      }
      // GUION_FLAT: penalize generic teacher scripts
      const GUION_FLAT_PATTERNS = /dar ejemplos|preguntar comprensi[oó]n|explicar|preguntar si|verificar comprensión|leer cada objetivo/i;
      if (guion && GUION_FLAT_PATTERNS.test(guion) && guion.length < 80) {
        flags.push({
          code: 'GUION_FLAT',
          severity: 'low',
          field: `slide${slide.numero}.guion_docente`,
          message: 'guion_docente uses generic phrasing — add specific examples or student-facing instructions',
        });
      }
    }
  }

  // General: any text field > 800 chars = signal of LLM sprawl
  for (const { value, path } of strings) {
    if (value.length > 800) {
      flags.push({
        code: 'LLM_SPRAWL',
        severity: 'high',
        field: path,
        message: `Field has ${value.length} chars (> 800) — possible LLM hallucination sprawl`,
      });
    }
  }

  return flags;
}

// ─── Check 2: Completeness ────────────────────────────────────────────────────
function checkCompleteness(output: unknown, type: string): QualityFlag[] {
  const flags: QualityFlag[] = [];

  if (type === 'slides' && Array.isArray(output)) {
    const slides = output as Record<string, unknown>[];
    const requiredFields = ['tipo', 'texto_pantalla', 'titulo'] as const;
    const slideTypes = new Set<string>();
    let hasPausa = false;
    let hasPromptImagenVariation = false;

    for (const slide of slides) {
      slideTypes.add(slide.tipo as string);
      if (slide.tipo === 'pausa') hasPausa = true;

      // Check prompt_imagen_variations for substantive content
      const variations = slide.prompt_imagen_variations as Array<Record<string, unknown>> | null | undefined;
      if (Array.isArray(variations) && variations.length > 0) {
        for (const v of variations) {
          const p = v.prompt as string | null | undefined;
          if (p && p.length > 20) hasPromptImagenVariation = true;
        }
      }

      for (const field of requiredFields) {
        const val = slide[field];
        if (val === undefined || val === null || val === '') {
          flags.push({
            code: 'MISSING_REQUIRED_FIELD',
            severity: 'high',
            field: `slide${slide.numero}.${field}`,
            message: `Slide ${slide.numero} missing or empty required field: ${field}`,
          });
        }
      }
    }

    if (!hasPausa) {
      flags.push({
        code: 'NO_ACTIVITY_BREAK',
        severity: 'medium',
        field: 'slides',
        message: 'No slide with tipo=pausa found — missing activity break for student engagement',
      });
    }

    if (!hasPromptImagenVariation) {
      flags.push({
        code: 'NO_PROMPT_VARIATIONS',
        severity: 'low',
        field: 'slides',
        message: 'No substantive prompt_imagen_variations found (>20 chars)',
      });
    }

    // NO_VISUAL_HINTS: check if any slide mentions diagrams/graphs/visuals
    const visualKeywords = /diagrama|gr[aá]fico|esquema|ilustraci[oó]n|imagen|foto|dibujo|mapa|tabla|cuadro|infograf[ií]a|l[ií]nea de tiempo|organizador gr[aá]fico/i;
    const hasVisualHint = slides.some(s => {
      const tp = (s.texto_pantalla as string || '') + ' ' + (s.guion_docente as string || '');
      return visualKeywords.test(tp);
    });
    // Also check prompt_imagen for variations that mention visual styles
    const allPrompts = slides.flatMap(s => {
      const vars = s.prompt_imagen_variations as Array<Record<string, unknown>> | null | undefined;
      return vars ? vars.map(v => v.prompt as string || '') : [s.prompt_imagen as string || ''];
    });
    const hasVisualPrompts = allPrompts.some(p => /illustration|diagram|chart|infographic|visual|flat illustration|educational style/i.test(p));
    if (!hasVisualHint && !hasVisualPrompts) {
      flags.push({
        code: 'NO_VISUAL_HINTS',
        severity: 'medium',
        field: 'slides',
        message: 'No slide mentions diagrams, graphics, or visual elements — add visual learning aids',
      });
    }
  }

  // All motors: should have conceptos_clave or equivalent
  const outputObj = output as Record<string, unknown>;
  const hasKeyConcepts = outputObj.conceptos_clave !== undefined ||
                         outputObj.conceptos !== undefined ||
                         outputObj.temas_desarrollados !== undefined;
  if (!hasKeyConcepts) {
    flags.push({
      code: 'NO_KEY_CONCEPTS',
      severity: 'medium',
      field: 'root',
      message: 'Output missing conceptos_clave or equivalent field',
    });
  }

  return flags;
}

// ─── Check 3: Placeholder/hallucination detection ─────────────────────────────
function checkPlaceholders(output: unknown): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const strings = collectStrings(output);

  for (const { value, path } of strings) {
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(value)) {
        flags.push({
          code: 'PLACEHOLDER_DETECTED',
          severity: 'high',
          field: path,
          message: `Placeholder text detected: "${value.slice(0, 50)}..." matches ${pattern.source}`,
        });
        break;  // one flag per field
      }
    }

    // Empty string in required-looking fields
    if (value === '' && !path.includes('[#]')) {
      flags.push({
        code: 'EMPTY_REQUIRED_FIELD',
        severity: 'medium',
        field: path,
        message: `Empty string found in field — likely missing content`,
      });
    }
  }

  return flags;
}

// ─── Check 4: Cultural sensitivity (heuristic) ───────────────────────────────
function checkCulturalSensitivity(output: unknown, params: Record<string, unknown> = {}): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const outputStr = JSON.stringify(output);
  const paramsStr = JSON.stringify(params);

  const hasIndigenousGroup = INDIGENOUS_GROUP_PATTERNS.test(outputStr);
  if (!hasIndigenousGroup) return flags;

  // Check if prompt_imagen variations use generic cultural imagery
  const promptImagenMatch = outputStr.match(/prompt_imagen[_\w]*\s*:\s*"([^"]+)"/gi);
  if (promptImagenMatch) {
    for (const match of promptImagenMatch) {
      if (GENERIC_CULTURAL_PATTERNS.test(match)) {
        flags.push({
          code: 'CULTURAL_GENERIC',
          severity: 'low',
          field: 'prompt_imagen',
          message: 'Image prompt may use generic cultural imagery for indigenous group — consider specificity',
        });
        break;
      }
    }
  }

  return flags;
}

// ─── Check 5: Pedagogical completeness ──────────────────────────────────────
function checkPedagogicalCompleteness(output: unknown, type: string): QualityFlag[] {
  const flags: QualityFlag[] = [];

  if (type === 'slides' && Array.isArray(output)) {
    const slides = output as Record<string, unknown>[];
    const tipos = new Set(slides.map(s => s.tipo as string));
    if (!tipos.has('portada')) {
      flags.push({ code: 'MISSING_PORTADA', severity: 'high', field: 'slides', message: 'Missing portada slide type' });
    }
    if (!tipos.has('objetivos')) {
      flags.push({ code: 'MISSING_OBJETIVOS', severity: 'high', field: 'slides', message: 'Missing objetivos slide type' });
    }
    if (!tipos.has('cierre')) {
      flags.push({ code: 'MISSING_CIERRE', severity: 'high', field: 'slides', message: 'Missing cierre slide type' });
    }
  }

  if (type === 'plan') {
    const plan = output as Record<string, unknown>;
    const secuencia = plan.secuencia_didactica as Record<string, unknown> | undefined;
    const bloques = secuencia?.bloques as Array<Record<string, unknown>> | undefined;
    if (!bloques) {
      flags.push({ code: 'MISSING_BLOQUES', severity: 'high', field: 'plan.secuencia_didactica.bloques', message: 'Missing secuencia_didactica.bloques' });
      return flags;
    }
    const nombres = new Set(bloques.map(b => (b.nombre as string)?.toLowerCase()));
    if (!nombres.has('inicio')) {
      flags.push({ code: 'MISSING_INICIO', severity: 'high', field: 'plan', message: 'Missing Inicio block in secuencia_didactica' });
    }
    if (!nombres.has('desarrollo')) {
      flags.push({ code: 'MISSING_DESARROLLO', severity: 'high', field: 'plan', message: 'Missing Desarrollo block in secuencia_didactica' });
    }
    if (!nombres.has('cierre')) {
      flags.push({ code: 'MISSING_PLAN_CIERRE', severity: 'high', field: 'plan', message: 'Missing Cierre block in secuencia_didactica' });
    }
  }

  if (type === 'quiz') {
    const quiz = output as Record<string, unknown>;
    const quizObj = quiz.quiz as Record<string, unknown> | undefined;
    const preguntas = quizObj?.preguntas as Array<Record<string, unknown>> | undefined;
    if (!preguntas || preguntas.length === 0) {
      flags.push({ code: 'NO_PREGUNTAS', severity: 'high', field: 'quiz.preguntas', message: 'No preguntas in quiz' });
      return flags;
    }
    const tipos = new Set(preguntas.map(p => p.tipo as string));
    if (tipos.size === 1) {
      flags.push({
        code: 'MONOTYPE_PREGUNTAS',
        severity: 'medium',
        field: 'quiz.preguntas',
        message: 'All preguntas have the same tipo — should mix oral/escrita/visual for pedagogical variety',
      });
    }
  }

  return flags;
}

// ─── Calibration clamp (P1.5-4) ───────────────────────────────────────────────
// The raw score from flags is too generous. Apply a mechanical clamp based on
// structural signals the LLM's self-check doesn't catch.
// P1.5: tightened ceiling (85→75) and added Bloom's + per-match generic penalties.
function calibrateScore(
  rawScore: number,
  output: unknown,
  type: string
): { score: number; penalty: number } {
  let penalty = 0;
  const outputArr = Array.isArray(output) ? output : [];
  const slides = outputArr as Record<string, unknown>[];

  if (type === 'slides') {
    // Too few slides — likely truncated (tighter: 25 vs 20)
    if (slides.length < 5) penalty += 25;

    // No image prompt variations — missing visual variety (tighter: 20 vs 15)
    const hasVariations = slides.some(s => {
      const vars = s.prompt_imagen_variations as Array<unknown> | null | undefined;
      return Array.isArray(vars) && vars.length > 0;
    });
    if (!hasVariations) penalty += 20;

    // Walls of text — tighter penalties with double-hit for extreme cases
    const avgTextLen = slides.reduce((sum, s) => {
      return sum + ((s.texto_pantalla as string)?.length || 0);
    }, 0) / Math.max(slides.length, 1);
    if (avgTextLen > 200) penalty += 15;    // Was 10
    if (avgTextLen > 300) penalty += 10;    // New: double penalty for extreme text

    // Generic teacher scripts — per-match (was flat 8 for any match)
    const genericPattern = /Dar ejemplos\.\s*Preguntar comprensión\.|explicar.*dar ejemplos/i;
    const genericCount = slides.filter(s =>
      genericPattern.test((s.guion_docente as string) || '')
    ).length;
    if (genericCount > 0) penalty += 8 * genericCount;

    // No visual hints — all text, no diagrams/graphics
    const visualKeywords = /diagrama|gr[aá]fico|esquema|ilustraci[oó]n|imagen/i;
    const hasVisualContent = slides.some(s =>
      visualKeywords.test((s.texto_pantalla as string) || '')
    );
    if (!hasVisualContent) penalty += 10;

    // Bloom's taxonomy: if objectives only use basic verbs, deduct 10
    const objetivosSlide = slides.find(s => (s.tipo as string) === 'objetivos');
    const objetivos = (objetivosSlide?.texto_pantalla as string) || '';
    const highLevelBloom = (objetivos.match(/\b(Aplicar|Analizar|Comparar|Crear|Evaluar|Síntesis)\b/gi) || []).length;
    if (highLevelBloom === 0) penalty += 10;
  }

  // Hard ceiling: 75 (was 85). Raw quality flags alone can't reach >75 for current content.
  const finalScore = Math.max(0, Math.min(75, rawScore - penalty));

  return { score: finalScore, penalty };
}

// ─── Scoring: sum deductions ─────────────────────────────────────────────────
function computeDeductions(flags: QualityFlag[]): number {
  let deduction = 0;
  for (const flag of flags) {
    switch (flag.code) {
      // High severity
      case 'PLACEHOLDER_DETECTED': deduction += 15; break;
      case 'MISSING_REQUIRED_FIELD': deduction += 10; break;
      case 'LLM_SPRAWL': deduction += 15; break;
      case 'MISSING_PORTADA': deduction += 10; break;
      case 'MISSING_OBJETIVOS': deduction += 10; break;
      case 'MISSING_CIERRE': deduction += 10; break;
      case 'MISSING_INICIO': deduction += 10; break;
      case 'MISSING_DESARROLLO': deduction += 10; break;
      case 'MISSING_PLAN_CIERRE': deduction += 10; break;
      case 'MISSING_BLOQUES': deduction += 10; break;
      case 'NO_PREGUNTAS': deduction += 10; break;
      // Medium severity
      case 'TEXT_TOO_LONG': deduction += 5; break;
      case 'NO_ACTIVITY_BREAK': deduction += 8; break;
      case 'NO_KEY_CONCEPTS': deduction += 5; break;
      case 'EMPTY_REQUIRED_FIELD': deduction += 8; break;
      case 'MONOTYPE_PREGUNTAS': deduction += 5; break;
      // Low severity
      case 'GUION_TOO_LONG': deduction += 3; break;
      case 'TEXT_SLIGHTLY_LONG': deduction += 3; break;
      case 'GUION_SLIGHTLY_LONG': deduction += 2; break;
      case 'NO_PROMPT_VARIATIONS': deduction += 15; break;
      case 'NO_VISUAL_HINTS': deduction += 10; break;
      case 'TEXT_DENSE': deduction += 8; break;
      case 'GUION_FLAT': deduction += 5; break;
      case 'CULTURAL_GENERIC': deduction += 0; break;  // Phase 4 will fix, no deduction now
      default: deduction += 5;
    }
  }
  return deduction;
}

// ─── Generate suggestions from flags ─────────────────────────────────────────
function generateSuggestions(flags: QualityFlag[], type: string): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const flag of flags) {
    const key = `${flag.code}:${flag.field}`;
    if (seen.has(key)) continue;
    seen.add(key);

    switch (flag.code) {
      case 'TEXT_TOO_LONG':
        suggestions.push('Reduce texto_pantalla to 40-150 chars for optimal cognitive load');
        break;
      case 'MISSING_REQUIRED_FIELD':
        suggestions.push(`Fill in missing required field: ${flag.field}`);
        break;
      case 'PLACEHOLDER_DETECTED':
        suggestions.push('Replace placeholder text with real content from source material');
        break;
      case 'NO_ACTIVITY_BREAK':
        suggestions.push('Add a tipo=pausa slide for student activity break');
        break;
      case 'NO_PROMPT_VARIATIONS':
        suggestions.push('Add prompt_imagen_variations with substantive image prompts (>20 chars)');
        break;
      case 'NO_KEY_CONCEPTS':
        suggestions.push('Add conceptos_clave or equivalent field to summarize core topics');
        break;
      case 'MISSING_PORTADA':
        suggestions.push('Add a tipo=portada slide as the first slide');
        break;
      case 'MISSING_OBJETIVOS':
        suggestions.push('Add a tipo=objetivos slide to state learning objectives');
        break;
      case 'MISSING_CIERRE':
        suggestions.push('Add a tipo=cierre slide for lesson wrap-up');
        break;
      case 'LLM_SPRAWL':
        suggestions.push(`Reduce content in ${flag.field} — likely LLM-generated padding`);
        break;
      case 'CULTURAL_GENERIC':
        suggestions.push('Replace generic cultural imagery with specific, respectful representations');
        break;
      case 'MONOTYPE_PREGUNTAS':
        suggestions.push('Mix pregunta types (oral/escrita/visual/desafio) for pedagogical variety');
        break;
      case 'TEXT_DENSE':
        suggestions.push('Split dense slides (200+ chars) into multiple slides or add a diagram/visual');
        break;
      case 'GUION_FLAT':
        suggestions.push('Add specific examples, student questions, or differentiation tips to guion_docente');
        break;
      case 'NO_VISUAL_HINTS':
        suggestions.push('Add diagrams, infographics, or visual anchors to at least one slide');
        break;
    }
  }

  return suggestions;
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export function checkQuality(type: string, output: unknown, params: Record<string, unknown> = {}): QualityScore {
  const flags: QualityFlag[] = [
    ...checkCognitiveLoad(output, type),
    ...checkCompleteness(output, type),
    ...checkPlaceholders(output),
    ...checkCulturalSensitivity(output, params),
    ...checkPedagogicalCompleteness(output, type),
  ];

  const deductions = computeDeductions(flags);
  const raw = Math.max(0, Math.min(100, 100 - deductions));

  // Floor: if content is substantive (non-empty texto_pantalla, unique titles),
  // score shouldn't go below 20 even with all violations
  let overall = raw;
  if (type === 'slides' && Array.isArray(output)) {
    const slides = output as Record<string, unknown>[];
    const hasNonEmptyContent = slides.some(s => {
      const tp = s.texto_pantalla as string | null | undefined;
      return tp && tp.trim().length > 0;
    });
    const uniqueTitles = new Set(slides.map(s => s.titulo as string).filter(Boolean));
    const isSubstantive = hasNonEmptyContent && uniqueTitles.size >= Math.min(3, slides.length);
    if (isSubstantive) {
      overall = Math.max(20, raw);
    }
  }

  // ── P1-4: Calibration clamp ──
  // The raw score from quality flags is too generous. Apply mechanical penalty
  // based on structural signals the LLM doesn't self-detect, and cap at 85.
  const calibrated = calibrateScore(overall, output, type);
  overall = calibrated.score;
  // Add calibration as a flag for transparency
  if (calibrated.penalty > 0) {
    flags.push({
      code: 'CALIBRATION_PENALTY',
      severity: 'high',
      field: 'root',
      message: `Calibration penalty: -${calibrated.penalty}pts applied (raw: ${raw}, effective cap: 75) — self-score is structurally inflated`,
    });
  }

  const suggestions = generateSuggestions(flags, type);

  return { overall, flags, suggestions };
}
