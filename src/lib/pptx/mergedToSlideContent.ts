/**
 * mergedToSlideContent — Adapter from slide editor MergedData to the SlideContent
 * shape that buildSlideDeck expects.
 *
 * MergedData is flat: title, subject, grade, bloomObjectives[], concepts[], activities[], copyBoxes[]
 * SlideContent is nested: cover.title, cover.subtitle, cover.grade, cover.subject, objectives[], slides[], activities[]
 *
 * This bridges the gap so buildSlideDeck gets the properties it reads.
 */

import type { SlideContent, ContentSlide, ActivitySlide } from './types';
import type { SlideItem } from '../../types/motor-types';

interface MergedData {
  title: string;
  subject: string;
  grade: string;
  bloomObjectives: string[];
  concepts: Array<{ title: string; description: string; icon: string }>;
  activities: Array<{ title: string; instructions?: string; questions?: Array<{ text: string; options?: string[] }> }>;
  copyBoxes: string[];
  paginas?: string;
  /** Raw slides array from slides motor — used directly if present */
  slides?: SlideItem[];
  [key: string]: unknown;
}

export function mergedToSlideContent(merged: MergedData): SlideContent {
  const title = merged.title || 'Presentación Educativa';
  const subject = merged.subject || 'Educación';
  const grade = merged.grade || '';
  const objectives = merged.bloomObjectives || [];
  const activities = merged.activities || [];
  const copyBoxes = merged.copyBoxes || [];

  // ── NEW: Use raw slides array if available (slides motor) ──
  if (merged.slides && Array.isArray(merged.slides) && merged.slides.length > 0) {
    return buildSlideContentFromSlides(merged, title, subject, grade);
  }

  // ── LEGACY: Build from concepts/activities (plan, ficha, etc.) ──
  return buildSlideContentFromConcepts(merged, title, subject, grade, objectives, activities, copyBoxes);
}

/**
 * Build SlideContent directly from the slides motor's SlideItem[] output.
 * Each slide already has titulo, texto_pantalla, guion_docente, etc.
 */
function buildSlideContentFromSlides(
  merged: MergedData,
  title: string,
  subject: string,
  grade: string,
): SlideContent {
  const slidesArray = merged.slides!;

  // Extract objectives from slide 2 if it's an objectives slide
  const objectivesSlide = slidesArray.find(s => s.tipo === 'objetivos');
  const objectives = objectivesSlide
    ? (objectivesSlide.texto_pantalla || '').split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•]\s*/, ''))
    : [];

  // Build content slides from all slides except portada and objetivos
  const contentSlides: ContentSlide[] = slidesArray
    .filter(s => s.tipo !== 'portada' && s.tipo !== 'objetivos')
    .map(s => ({
      title: s.titulo || 'Concepto',
      paragraphs: extractParagraphs(s),
      ...(s.callout ? { copyToNotebook: s.callout } : {}),
    }));

  // If no content slides after filtering, use ALL slides as content
  const slides = contentSlides.length > 0
    ? contentSlides
    : slidesArray.map(s => ({
        title: s.titulo || 'Slide',
        paragraphs: [s.texto_pantalla || ''],
        ...(s.callout ? { copyToNotebook: s.callout } : {}),
      }));

  return {
    cover: {
      title,
      subtitle: `${subject}${grade ? ` · ${grade}` : ''}`,
      grade,
      subject,
    },
    objectives,
    slides,
    // Preserve flat properties for backward compatibility
    title,
    subject,
    grade,
    bloomObjectives: objectives.length > 0 ? objectives : merged.bloomObjectives || [],
    concepts: [],
    copyBoxes: [],
    paginas: merged.paginas,
  };
}

/** Extract meaningful paragraphs from a SlideItem */
function extractParagraphs(s: SlideItem): string[] {
  const parts = [s.texto_pantalla || '', s.guion_docente || '']
    .filter(Boolean)
    .flatMap(t => t.split('\n').map(p => p.trim()).filter(Boolean));
  return parts.length > 0 ? parts : ['Sin contenido'];
}

/**
 * Legacy: build SlideContent from concepts/activities (plan, ficha, etc.)
 */
function buildSlideContentFromConcepts(
  merged: MergedData,
  title: string,
  subject: string,
  grade: string,
  objectives: string[],
  activities: Array<{ title: string; instructions?: string; questions?: Array<{ text: string; options?: string[] }> }>,
  copyBoxes: string[],
): SlideContent {
  const concepts = merged.concepts || [];

  // Build content slides from concepts
  const slides: ContentSlide[] = concepts.map((concept, i) => {
    const paragraphs = (concept.description || '')
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);

    // Attach one copy box per concept (by index, if available)
    const copyBox = copyBoxes[i];

    return {
      title: concept.title || 'Concepto',
      paragraphs: paragraphs.length > 0 ? paragraphs : ['Sin contenido'],
      ...(copyBox ? { copyToNotebook: copyBox } : {}),
    };
  });

  // Remaining copy boxes beyond concept count → extra slides
  const conceptCount = concepts.length;
  const remainingBoxes = copyBoxes.slice(conceptCount);
  for (const box of remainingBoxes) {
    slides.push({
      title: '📝 Para copiar',
      paragraphs: [box],
    });
  }

  // Build activity slides
  const activitySlides: ActivitySlide[] = activities.map(act => ({
    title: act.title || 'Actividad',
    instruction: act.instructions || 'Sigue las instrucciones del docente.',
    questions: (act.questions || []).map(q => ({
      text: q.text,
      ...(q.options ? { options: q.options } : {}),
    })),
  }));

  return {
    cover: {
      title,
      subtitle: `${subject}${grade ? ` · ${grade}` : ''}`,
      grade,
      subject,
    },
    objectives,
    slides,
    ...(activitySlides.length > 0 ? { activities: activitySlides } : {}),
    // Preserve flat properties for backward compatibility
    title,
    subject,
    grade,
    bloomObjectives: objectives,
    concepts,
    copyBoxes,
    paginas: merged.paginas,
  };
}
