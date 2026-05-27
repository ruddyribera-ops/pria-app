/**
 * Converts merged multi-phase results into an array of EditorSlide
 * for the live preview / editor.
 */

import type { Palette } from '../../lib/pptx/types';
import { getPalette } from '../../lib/pptx/designSystem';
import type { EditorSlide, EditorElement } from './types';

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
  [key: string]: unknown;
}

const BLOOM_LABELS = ['Recordar', 'Comprender', 'Aplicar', 'Analizar', 'Evaluar', 'Crear'];

/**
 * Map merged phase results → array of visual slides for the editor.
 */
export function mapToEditorSlides(data: MergedData): EditorSlide[] {
  const slides: EditorSlide[] = [];
  let slideNum = 0;

  // ── 1. Cover slide ──
  slideNum++;
  slides.push({
    id: 'cover',
    type: 'cover',
    label: 'Portada',
    number: slideNum,
    elements: buildCoverElements(data),
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
