/**
 * DOCX export using the `docx` npm library (browser-compatible via buffer polyfill).
 * Takes pre-extracted SlideData[] and renders a formatted .docx file.
 */

import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Footer, PageNumber } from 'docx';
import type { SlidesOutput, PlanOutput, SynthesisOutput, QuizOutput } from '../../types/motor-types';

// Buffer is already polyfilled in main.tsx (globalThis.Buffer)
// This helper safely converts Buffer or Uint8Array to Uint8Array for Blob
const toUint8Array = (buf: any): Uint8Array => {
  if (buf instanceof Uint8Array) return buf;
  if ((globalThis as any).Buffer?.isBuffer(buf)) {
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  return new Uint8Array(buf);
};

export interface TeacherInfo {
  nombre?: string;
  email?: string;
  escuela?: string;
}

export type SlideData = {
  title: string;
  content: string;
  type: 'cover' | 'content' | 'objectives' | 'activity' | 'closing';
};

/**
 * Extract SlideData[] from any motor output type.
 */
function extractSlides(output: any, motorId: string): { title: string; slides: SlideData[] } {
  if (isSynthesisOutput(output)) {
    const synth = output as SynthesisOutput;
    const title = 'Síntesis Curricular';
    const slides: SlideData[] = synth.unidad_sintetizada.temas_desarrollados.map((tema) => ({
      title: tema.nombre,
      content: [
        'Conceptos clave: ' + (tema.conceptos_clave?.join(', ') || 'N/A'),
        'Inteligencias: ' + (tema.inteligencias_sugeridas?.join(', ') || 'N/A'),
        'Actividades: ' + (tema.actividades?.map((a) => `${a.tipo} (${a.inteligencia})`).join(', ') || 'N/A'),
      ].join('\n\n'),
      type: 'content' as const,
    }));
    return { title, slides };
  }

  if (isPlanOutput(output)) {
    const plan = output as PlanOutput;
    const title = 'Plan de Clase';
    const slides: SlideData[] = plan.secuencia_didactica.bloques.map((bloque) => ({
      title: `${bloque.nombre} (${bloque.duracion} min)`,
      content: `Objetivo: ${bloque.objetivo}\n\n${bloque.actividad}`,
      type: 'content' as const,
    }));
    return { title, slides };
  }

  if (isSlidesOutput(output)) {
    const slidesOut = output as SlidesOutput;
    const title = 'Diapositivas';
    const slides: SlideData[] = slidesOut.map((slide) => ({
      title: slide.titulo,
      content: slide.texto_pantalla,
      type: 'content' as const,
    }));
    return { title, slides };
  }

  if (isQuizOutput(output)) {
    const quiz = output as QuizOutput;
    const title = 'Pop Quiz';
    const slides: SlideData[] = quiz.quiz.preguntas.map((pregunta) => ({
      title: `Pregunta ${pregunta.numero}`,
      content: pregunta.pregunta + (pregunta.opciones ? '\n\nOpciones:\n' + pregunta.opciones.join('\n') : ''),
      type: 'content' as const,
    }));
    return { title, slides };
  }

  return { title: motorId, slides: [] };
}

function isSynthesisOutput(o: any): o is SynthesisOutput {
  return o && 'unidad_sintetizada' in o;
}
function isPlanOutput(o: any): o is PlanOutput {
  return o && 'secuencia_didactica' in o;
}
function isSlidesOutput(o: any): o is SlidesOutput {
  return Array.isArray(o);
}
function isQuizOutput(o: any): o is QuizOutput {
  return o && 'quiz' in o;
}

/**
 * Generate a real DOCX from motor output using the `docx` library.
 * Accepts any motor output type — unsupported types produce an empty document.
 */
export async function exportToDOCX(output: any, teacherInfo?: TeacherInfo): Promise<Blob> {
  const motorId = 'material';
  const { title, slides } = extractSlides(output, motorId);

  const date = new Date().toLocaleDateString('es-BO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const children: Paragraph[] = [];

  // Cover page
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'PRIA v10 — Plataforma de Planificación Docente con IA', italics: true, size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: date, size: 18 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    ...(teacherInfo?.nombre ? [
      new Paragraph({
        children: [new TextRun({ text: `Docente: ${teacherInfo.nombre}`, bold: true, size: 18, color: '3A9E5E' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      ...(teacherInfo.email || teacherInfo.escuela ? [
        new Paragraph({
          children: [new TextRun({ text: [teacherInfo.email, teacherInfo.escuela].filter(Boolean).join(' · '), size: 16, color: '6B7280' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
      ] : []),
    ] : []),
    new Paragraph({
      children: [new TextRun({ text: `${slides.length} sección${slides.length !== 1 ? 'es' : ''}`, size: 16, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '', pageBreakBefore: true })
  );

  // Content sections
  slides.forEach((slide, i) => {
    // Section heading
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, color: '3A9E5E', size: 24 }),
          new TextRun({ text: slide.title || 'Sin título', bold: true, size: 26, color: '0F766E' }),
        ],
        spacing: { before: 240, after: 120 },
      })
    );

    // Section content
    const contentLines = (slide.content || '').split('\n').filter(line => line.trim());
    contentLines.forEach(line => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line.trim(), size: 22 })],
          spacing: { after: 80 },
        })
      );
    });

    // Spacer between sections
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
  });

  // Footer page
  children.push(
    new Paragraph({ text: '', pageBreakBefore: true }),
    new Paragraph({
      children: [new TextRun({ text: 'Generado por PRIA v10', italics: true, size: 18, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 4800 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Plataforma de Planificación Docente con IA', size: 16, color: '9CA3AF' })],
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({
    creator: 'PRIA v10',
    title: title,
    description: `Material educativo generado por PRIA v10 — ${date}`,
    sections: [
      {
        properties: {},
        children,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'PRIA v10 — ', size: 14, color: '9CA3AF', italics: true }),
                  new TextRun({ text: 'Página ', size: 14, color: '9CA3AF' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: '9CA3AF' }),
                ],
              }),
            ],
          }),
        },
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  // Convert Buffer or Uint8Array to plain Uint8Array for Blob
  const arrayBuffer = toUint8Array(buffer);

  return new Blob([arrayBuffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Fallback: Generate a plain-text blob as last resort.
 */
export async function exportToDOCXFallback(output: any): Promise<Blob> {
  const { title, slides } = extractSlides(output, 'material');
  const content = [title, '', '='.repeat(40), '', ...slides.map(s => `${s.title}\n\n${s.content}`), '', '---', 'Generado por PRIA v10'].join('\n\n');
  return new Blob([content], { type: 'text/plain' });
}
