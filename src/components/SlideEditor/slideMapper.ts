/**
 * Converts merged multi-phase results into an array of EditorSlide
 * for the live preview / editor.
 */

import type { Palette } from '../../lib/pptx/types';
import { getPalette } from '../../lib/pptx/designSystem';
import type { EditorSlide, EditorElement, PromptVariation } from './types';

/** The shape produced by mergePhaseResults() */
interface MergedData {
  title: string;
  subject: string;
  grade: string;
  bloomObjectives: string[];
  concepts: Array<{ title: string; description: string; icon: string }>;
  activities: Array<{ title: string; instructions?: string; questions?: Array<{ text: string; options?: string[] }> }>;
  copyBoxes: string[];
  paginas?: string;
  /** Raw slides array from slides motor (10 SlideItems) */
  slides?: Array<{
    numero: number;
    tipo: string;
    titulo: string;
    texto_pantalla?: string;
    guion_docente?: string;
    prompt_imagen?: string;
    callout?: string;
    prompt_imagen_variations?: PromptVariation[];
  }>;
  [key: string]: unknown;
}

const BLOOM_LABELS = ['Recordar', 'Comprender', 'Aplicar', 'Analizar', 'Evaluar', 'Crear'];

/** Slides output from motor with prompt variations */
interface SlidesOutputItem {
  numero?: number;
  prompt_imagen_variations?: PromptVariation[];
}

/**
 * Map merged phase results → array of visual slides for the editor.
 * If data.slides (raw SlideItem[]) is present, use it directly.
 * Otherwise, fall back to concepts/activities pattern.
 * If slidesOutput is provided, attaches prompt_variations to each slide.
 */
export function mapToEditorSlides(
  data: MergedData,
  slidesOutput?: SlidesOutputItem[],
): EditorSlide[] {
  // ── NEW: Use data.slides if available (slides motor raw output) ──
  if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
    return mapSlidesFromMotorOutput(data, slidesOutput);
  }

  // ── LEGACY: Build from concepts/activities (plan, ficha, etc.) ──
  return mapSlidesFromConcepts(data, slidesOutput);
}

/**
 * Build editor slides directly from the motor's SlideItem[] output.
 * Each slide already has titulo, texto_pantalla, guion_docente, etc.
 */
function mapSlidesFromMotorOutput(
  data: MergedData,
  slidesOutput?: SlidesOutputItem[],
): EditorSlide[] {
  const slides: EditorSlide[] = [];

  // Build a map of slide number → prompt variations from slidesOutput prop
  const promptsBySlide = new Map<number, PromptVariation[]>();
  if (slidesOutput) {
    for (const slide of slidesOutput) {
      if (slide.numero && slide.prompt_imagen_variations?.length) {
        promptsBySlide.set(slide.numero, slide.prompt_imagen_variations);
      }
    }
  }

  // Also extract prompt_imagen_variations from the data.slides themselves
  for (const slide of data.slides!) {
    if (slide.numero && slide.prompt_imagen_variations?.length) {
      promptsBySlide.set(slide.numero, slide.prompt_imagen_variations);
    }
  }

  for (const raw of data.slides!) {
    const tipo = raw.tipo || 'concepto';
    const num = raw.numero;

    if (tipo === 'portada') {
      slides.push({
        id: `slide-${num}`,
        type: 'cover' as const,
        label: raw.titulo || 'Portada',
        number: num,
        elements: [
          { id: 'cover-title', type: 'title' as const, content: raw.titulo || data.title || 'Título' },
          { id: 'cover-subtitle', type: 'text' as const, content: raw.texto_pantalla || `${data.subject}${data.grade ? ` · ${data.grade}` : ''}` },
          { id: 'cover-img', type: 'image' as const, content: '', imageData: '' },
        ],
        promptVariations: promptsBySlide.get(num) || raw.prompt_imagen_variations,
      });
    } else if (tipo === 'objetivos') {
      const lines = (raw.texto_pantalla || '').split('\n').filter(l => l.trim());
      slides.push({
        id: `slide-${num}`,
        type: 'objectives' as const,
        label: raw.titulo || 'Objetivos',
        number: num,
        elements: [
          { id: 'obj-title', type: 'title' as const, content: raw.titulo || '🎯 Objetivos de Aprendizaje' },
          ...lines.map((line, i) => ({
            id: `obj-${i}`,
            type: 'badge' as const,
            content: line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''),
            badgeLabel: BLOOM_LABELS[Math.min(i, BLOOM_LABELS.length - 1)],
            orderIndex: i + 1,
          })),
        ],
        promptVariations: promptsBySlide.get(num) || raw.prompt_imagen_variations,
      });
    } else if (tipo === 'pausa') {
      // Pausa activa → render as content with the texto_pantalla as instructions
      const lines = (raw.texto_pantalla || '').split('\n').filter(l => l.trim());
      slides.push({
        id: `slide-${num}`,
        type: 'content' as const,
        label: raw.titulo || 'Actividad',
        number: num,
        elements: [
          { id: 'content-title', type: 'title' as const, content: raw.titulo || '¡Movimiento!' },
          { id: 'content-img', type: 'image' as const, content: '', imageData: '' },
          ...lines.map((line, i) => ({
            id: `content-para-${i}`,
            type: 'text' as const,
            content: line,
          })),
          ...(raw.callout
            ? [{ id: 'content-copy', type: 'copyBox' as const, content: raw.callout }]
            : []),
        ],
        promptVariations: promptsBySlide.get(num) || raw.prompt_imagen_variations,
      });
    } else {
      // concepto, cierre, or any other type → render as content slide
      const lines = (raw.texto_pantalla || '').split('\n').filter(l => l.trim());
      slides.push({
        id: `slide-${num}`,
        type: 'content' as const,
        label: raw.titulo || 'Concepto',
        number: num,
        elements: [
          { id: 'content-title', type: 'title' as const, content: raw.titulo || 'Concepto' },
          { id: 'content-img', type: 'image' as const, content: '', imageData: '' },
          ...lines.map((line, i) => ({
            id: `content-para-${i}`,
            type: 'text' as const,
            content: line,
          })),
          ...(raw.callout
            ? [{ id: 'content-copy', type: 'copyBox' as const, content: raw.callout }]
            : []),
        ],
        promptVariations: promptsBySlide.get(num) || raw.prompt_imagen_variations,
      });
    }
  }

  return slides;
}

/**
 * Legacy: build editor slides from concepts/activities (for plan, ficha, etc.)
 */
function mapSlidesFromConcepts(
  data: MergedData,
  slidesOutput?: SlidesOutputItem[],
): EditorSlide[] {
  const slides: EditorSlide[] = [];
  let slideNum = 0;

  // Build a map of slide number → prompt variations
  const promptsBySlide = new Map<number, PromptVariation[]>();
  if (slidesOutput) {
    for (const slide of slidesOutput) {
      if (slide.numero && slide.prompt_imagen_variations?.length) {
        promptsBySlide.set(slide.numero, slide.prompt_imagen_variations);
      }
    }
  }

  // ── 1. Cover slide ──
  slideNum++;
  slides.push({
    id: 'cover',
    type: 'cover',
    label: 'Portada',
    number: slideNum,
    elements: buildCoverElements(data),
    promptVariations: promptsBySlide.get(slideNum),
  });

  // ── 2. Objectives slide ──
  if (data.bloomObjectives?.length > 0) {
    slideNum++;
    slides.push({
      id: 'objectives',
      type: 'objectives',
      label: 'Objetivos de Aprendizaje',
      number: slideNum,
      elements: buildObjectiveElements(data.bloomObjectives),
      promptVariations: promptsBySlide.get(slideNum),
    });
  }

  // ── 3. Content slides ──
  if (data.concepts?.length > 0) {
    for (let i = 0; i < data.concepts.length; i++) {
      slideNum++;
      const concept = data.concepts[i];
      slides.push({
        id: `content-${i}`,
        type: 'content',
        label: concept.title,
        number: slideNum,
        elements: buildContentElements(concept, data.copyBoxes?.[i]),
        promptVariations: promptsBySlide.get(slideNum),
      });
    }
  }

  // ── 4. Activity slides ──
  if (data.activities?.length > 0) {
    for (let i = 0; i < data.activities.length; i++) {
      slideNum++;
      const act = data.activities[i];
      slides.push({
        id: `activity-${i}`,
        type: 'activity',
        label: act.title,
        number: slideNum,
        elements: buildActivityElements(act),
        promptVariations: promptsBySlide.get(slideNum),
      });
    }
  }

  // ── 5. Remaining copy boxes as a final slide ──
  const conceptCount = data.concepts?.length || 0;
  const remainingBoxes = data.copyBoxes?.slice(conceptCount) || [];
  if (remainingBoxes.length > 0) {
    slideNum++;
    slides.push({
      id: 'copy-slide',
      type: 'copy',
      label: '📝 Para copiar',
      number: slideNum,
      elements: remainingBoxes.map((box, i) => ({
        id: `copy-${i}`,
        type: 'copyBox' as const,
        content: box,
      })),
      promptVariations: promptsBySlide.get(slideNum),
    });
  }

  return slides;
}

function buildCoverElements(data: MergedData): EditorElement[] {
  const elements: EditorElement[] = [];

  // Title
  elements.push({
    id: 'cover-title',
    type: 'title',
    content: data.title || 'Título de la clase',
  });

  // Subject & grade line
  const subText = data.paginas
    ? `${data.subject} · ${data.grade} · Págs: ${data.paginas}`
    : `${data.subject} · ${data.grade}`;
  elements.push({
    id: 'cover-subtitle',
    type: 'text',
    content: subText,
  });

  return elements;
}

function buildObjectiveElements(objectives: string[]): EditorElement[] {
  const elements: EditorElement[] = [];

  // Title
  elements.push({
    id: 'obj-title',
    type: 'title',
    content: '🎯 Objetivos de Aprendizaje',
  });

  objectives.forEach((obj, i) => {
    const levelLabel = BLOOM_LABELS[Math.min(i, BLOOM_LABELS.length - 1)];
    elements.push({
      id: `obj-${i}`,
      type: 'badge',
      content: obj,
      badgeLabel: levelLabel,
      orderIndex: i + 1,
    });
  });

  return elements;
}

function buildContentElements(
  concept: { title: string; description: string; icon: string },
  attachedCopyBox?: string
): EditorElement[] {
  const elements: EditorElement[] = [];

  // Title
  elements.push({
    id: `content-title`,
    type: 'title',
    content: concept.title,
  });

  // Image slot (empty by default)
  elements.push({
    id: `content-img`,
    type: 'image',
    content: '',
    imageData: '',
  });

  // Description paragraphs
  const paragraphs = concept.description.split('\n').filter(Boolean);
  paragraphs.forEach((para, i) => {
    elements.push({
      id: `content-para-${i}`,
      type: 'text',
      content: para,
    });
  });

  // Attached copy box
  if (attachedCopyBox) {
    elements.push({
      id: `content-copy`,
      type: 'copyBox',
      content: attachedCopyBox,
    });
  }

  return elements;
}

function buildActivityElements(act: {
  title: string;
  instructions?: string;
  questions?: Array<{ text: string; options?: string[] }>;
}): EditorElement[] {
  const elements: EditorElement[] = [];

  // Title
  elements.push({
    id: `act-title`,
    type: 'title',
    content: act.title,
  });

  // Instructions
  if (act.instructions) {
    elements.push({
      id: `act-instructions`,
      type: 'text',
      content: act.instructions,
    });
  }

  // Questions
  act.questions?.forEach((q, qi) => {
    elements.push({
      id: `act-q-${qi}`,
      type: 'text',
      content: `${qi + 1}. ${q.text}`,
      orderIndex: qi + 1,
    });

    q.options?.forEach((opt, oi) => {
      const letter = String.fromCharCode(65 + oi); // A, B, C...
      elements.push({
        id: `act-q-${qi}-opt-${oi}`,
        type: 'bullet',
        content: `${letter}) ${opt}`,
      });
    });
  });

  return elements;
}

/**
 * Get the palette for a given subject string.
 */
export function getEditorPalette(subject: string): Palette {
  return getPalette(subject);
}
