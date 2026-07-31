/**
 * PDF export using jsPDF.
 * Takes pre-extracted SlideData[] and renders a multi-page A4 PDF.
 */

import type { SlidesOutput, PlanOutput, SynthesisOutput, QuizOutput } from '../../types/motor-types';

export interface FuenteMetadata {
  titulo: string;
  autor?: string;
  editorial?: string;
  anio?: number;
  paginasUsadas?: string;
}

export interface TeacherInfo {
  nombre?: string;
  email?: string;
  escuela?: string;
  ciudad?: string;
  grado?: string;
  materia?: string;
  anoEscolar?: string;
  // NEW: institutional metadata for Bolivia
  objetivoAprendizaje?: string;
  duracionEstimadaMinutos?: number;
  areaCurricular?: string;
  fuente?: FuenteMetadata;
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
      content: slide.texto_pantalla || slide.titulo || '',
      type: 'content' as const,
    }));
    return { title, slides };
  }

  if (isQuizOutput(output)) {
    const quiz = output as QuizOutput;
    const title = 'Pop Quiz';
    const slides: SlideData[] = quiz.quiz.preguntas.map((pregunta) => {
      const letras = ['a', 'b', 'c', 'd', 'e'];
      const opcionesTexto = pregunta.opciones?.length
        ? '\n\nOpciones:\n' + pregunta.opciones.map((op, i) => `  ${letras[i] ?? String(i + 1)}) ${op}`).join('\n')
        : '';
      return {
        title: `Pregunta ${pregunta.numero}`,
        content: pregunta.pregunta + opcionesTexto,
        type: 'content' as const,
      };
    });
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
 * Generate a real PDF from motor output using jsPDF.
 * Detects the output type, extracts slides, and renders them.
 * Accepts any motor output type — unsupported types produce an empty PDF.
 */
export async function exportToPDF(output: any, teacherInfo?: TeacherInfo): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const motorId = 'material';
  const { title, slides } = extractSlides(output, motorId);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 50;
  const contentW = pageW - margin * 2;

  // Cover page
  pdf.setFillColor(250, 250, 250);
  pdf.rect(0, 0, pageW, pageH, 'F');

  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 118, 110);
  pdf.text(title, margin, 120, { maxWidth: contentW });

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Generado por PRIA v10', margin, 160);
  pdf.text(new Date().toLocaleDateString('es-BO'), margin, 182);

  // Teacher personalization
  let teacherY = 210;
  if (teacherInfo?.nombre) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(58, 158, 94);
    pdf.text(`Docente: ${teacherInfo.nombre}`, margin, teacherY);
    teacherY += 20;
  }
  if (teacherInfo?.email || teacherInfo?.escuela) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const contact = [teacherInfo.email, teacherInfo.escuela].filter(Boolean).join(' · ');
    pdf.text(contact, margin, teacherY);
    teacherY += 16;
  }

  // Institutional metadata block (only show if any field is present)
  if (teacherInfo && (teacherInfo.objetivoAprendizaje || teacherInfo.duracionEstimadaMinutos || teacherInfo.areaCurricular || teacherInfo.fuente?.titulo)) {
    let metaY = teacherY + (teacherInfo.nombre ? 30 : 10);

    // Thin separator line
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.5);
    pdf.line(margin, metaY - 5, pageW - margin, metaY - 5);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);

    if (teacherInfo.areaCurricular) {
      pdf.text(`📚 Área: ${teacherInfo.areaCurricular}`, margin, metaY);
      metaY += 14;
    }
    if (teacherInfo.duracionEstimadaMinutos) {
      pdf.text(`⏱ Duración: ${teacherInfo.duracionEstimadaMinutos} minutos`, margin, metaY);
      metaY += 14;
    }
    if (teacherInfo.objetivoAprendizaje) {
      const objetivo = teacherInfo.objetivoAprendizaje.length > 120
        ? teacherInfo.objetivoAprendizaje.slice(0, 117) + '...'
        : teacherInfo.objetivoAprendizaje;
      pdf.text(`🎯 Objetivo: ${objetivo}`, margin, metaY);
      metaY += 14;
    }
    if (teacherInfo.fuente?.titulo) {
      pdf.text(`📖 Fuente: ${teacherInfo.fuente.titulo}`, margin, metaY);
    }
  }

  pdf.setFontSize(11);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`${slides.length} sección${slides.length !== 1 ? 'es' : ''}`, margin, teacherY + (teacherInfo?.nombre ? 20 : 0) + 40);

  // Slides
  for (let i = 0; i < slides.length; i++) {
    pdf.addPage();

    // Slide number badge top-left
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(58, 158, 94);
    pdf.text(`${i + 1} / ${slides.length}`, margin, 30);

    // Thin accent line under badge
    pdf.setDrawColor(58, 158, 94);
    pdf.setLineWidth(1);
    pdf.line(margin, 36, margin + 20, 36);

    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 118, 110);
    pdf.text(slides[i].title || 'Sin título', margin, 70, { maxWidth: contentW });

    // Divider
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 82, pageW - margin, 82);

    // Content body
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55);
    const lines = pdf.splitTextToSize(slides[i].content || '', contentW);
    pdf.text(lines, margin, 106);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(180, 180, 180);
    pdf.text('PRIA v10 — Plataforma de Planificación con IA', margin, pageH - 30);
    pdf.text(`Página ${i + 1} de ${slides.length}`, pageW - margin - 40, pageH - 30);
  }

  return pdf.output('blob');
}

/**
 * Generate a simple text-based PDF fallback (no external dependencies).
 */
export async function exportToPDFFallback(output: any): Promise<Blob> {
  const content = JSON.stringify(output, null, 2);
  const blob = new Blob([content], { type: 'text/plain' });
  return blob;
}
