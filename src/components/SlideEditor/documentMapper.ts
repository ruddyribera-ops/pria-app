/**
 * documentMapper — converts ANY merged data into an array of EditableElement
 * for the DocumentEditor. Works for all motor types.
 *
 * Each element gets a unique ID, type, and content so the editor
 * can track edits and apply them back.
 */

import type { EditorElement } from './types';

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

export function mapDocumentToElements(data: MergedData): EditorElement[] {
  const elements: EditorElement[] = [];

  // ── Document title ──
  elements.push({
    id: 'doc-title',
    type: 'title',
    content: data.title || 'Documento',
  });

  // ── Subject / grade info ──
  const infoParts = [data.subject, data.grade].filter(Boolean);
  if (infoParts.length > 0) {
    elements.push({
      id: 'doc-info',
      type: 'text',
      content: infoParts.join(' · '),
    });
  }

  if (data.paginas) {
    elements.push({
      id: 'doc-paginas',
      type: 'text',
      content: `Páginas: ${data.paginas}`,
    });
  }

  // ── Bloom Objectives ──
  if (data.bloomObjectives?.length > 0) {
    elements.push({
      id: 'doc-obj-header',
      type: 'title',
      content: '🎯 Objetivos de Aprendizaje',
    });

    data.bloomObjectives.forEach((obj, i) => {
      elements.push({
        id: `doc-obj-${i}`,
        type: 'badge',
        content: obj,
        badgeLabel: BLOOM_LABELS[Math.min(i, BLOOM_LABELS.length - 1)],
        orderIndex: i + 1,
      });
    });
  }

  // ── Concepts ──
  if (data.concepts?.length > 0) {
    elements.push({
      id: 'doc-concept-header',
      type: 'title',
      content: '📇 Contenido',
    });

    data.concepts.forEach((concept, i) => {
      elements.push({
        id: `doc-concept-title-${i}`,
        type: 'text',
        content: concept.title,
        badgeLabel: concept.icon || undefined,
      });

      const descLines = concept.description.split('\n').filter(Boolean);
      descLines.forEach((line, li) => {
        elements.push({
          id: `doc-concept-desc-${i}-${li}`,
          type: 'text',
          content: line,
        });
      });
    });
  }

  // ── Activities ──
  if (data.activities?.length > 0) {
    elements.push({
      id: 'doc-act-header',
      type: 'title',
      content: '✏️ Actividades',
    });

    data.activities.forEach((act, i) => {
      elements.push({
        id: `doc-act-title-${i}`,
        type: 'text',
        content: act.title,
      });

      if (act.instructions) {
        elements.push({
          id: `doc-act-instr-${i}`,
          type: 'text',
          content: act.instructions,
        });
      }

      act.questions?.forEach((q, qi) => {
        elements.push({
          id: `doc-act-q-${i}-${qi}`,
          type: 'badge',
          content: q.text,
          orderIndex: qi + 1,
        });

        q.options?.forEach((opt, oi) => {
          const letter = String.fromCharCode(65 + oi);
          elements.push({
            id: `doc-act-opt-${i}-${qi}-${oi}`,
            type: 'bullet',
            content: `${letter}) ${opt}`,
          });
        });
      });
    });
  }

  // ── Copy boxes ──
  if (data.copyBoxes?.length > 0) {
    elements.push({
      id: 'doc-copy-header',
      type: 'title',
      content: '📝 Para copiar en tu cuaderno',
    });

    data.copyBoxes.forEach((box, i) => {
      elements.push({
        id: `doc-copy-${i}`,
        type: 'copyBox',
        content: box,
      });
    });
  }

  return elements;
}

/**
 * Apply edits back onto the merged data.
 */
export function applyEditsToDocument(
  data: MergedData,
  edits: Record<string, string>,
): MergedData {
  const result: MergedData = JSON.parse(JSON.stringify(data));

  // Title
  if (edits['doc-title']) {
    result.title = edits['doc-title'];
  }

  // Objectives
  if (result.bloomObjectives) {
    result.bloomObjectives.forEach((_, i) => {
      const key = `doc-obj-${i}`;
      if (edits[key]) {
        result.bloomObjectives[i] = edits[key];
      }
    });
  }

  // Concepts
  if (result.concepts) {
    result.concepts.forEach((concept, i) => {
      const titleKey = `doc-concept-title-${i}`;
      if (edits[titleKey]) {
        concept.title = edits[titleKey];
      }

      const descLines = concept.description.split('\n').filter(Boolean);
      let changed = false;
      descLines.forEach((_, li) => {
        const dk = `doc-concept-desc-${i}-${li}`;
        if (edits[dk]) {
          descLines[li] = edits[dk];
          changed = true;
        }
      });
      if (changed) {
        concept.description = descLines.join('\n');
      }
    });
  }

  // Activities
  if (result.activities) {
    result.activities.forEach((act, i) => {
      const titleKey = `doc-act-title-${i}`;
      if (edits[titleKey]) {
        act.title = edits[titleKey];
      }

      const instrKey = `doc-act-instr-${i}`;
      if (edits[instrKey] && act.instructions) {
        act.instructions = edits[instrKey];
      }

      act.questions?.forEach((q, qi) => {
        const qk = `doc-act-q-${i}-${qi}`;
        if (edits[qk]) {
          q.text = edits[qk].replace(/^\d+[.)]\s*/, '');
        }
      });
    });
  }

  // Copy boxes
  if (result.copyBoxes) {
    result.copyBoxes.forEach((_, i) => {
      const ck = `doc-copy-${i}`;
      if (edits[ck]) {
        result.copyBoxes[i] = edits[ck];
      }
    });
  }

  return result;
}
