import PptxGenJS from 'pptxgenjs';
import { FONT_TITLE, FONT_BODY, COLOR_ORANGE, COLOR_WHITE, COLOR_TEXT, COLOR_SUBTLE } from './types';
import type { PlanOutput } from '../../../types/motor-types';
import type { Palette } from '../types';
import type { TeacherInfo } from '../../export/pdf';

/** 5E Instructional Model phases */
const PHASES_5E = [
  { 
    name: 'Engage', 
    spanish: 'Inicio (Engage)', 
    timeMin: 7, 
    description: 'Activar conocimiento previo, generar curiosidad y interés',
    color: '#E74C3C'
  },
  { 
    name: 'Explore', 
    spanish: 'Exploración (Explore)', 
    timeMin: 12, 
    description: 'Manipular materiales, hacer observaciones y descubrir patrones',
    color: '#3498DB'
  },
  { 
    name: 'Explain', 
    spanish: 'Explicación (Explain)', 
    timeMin: 13, 
    description: 'Construir conceptos, formalizar vocabulario y aclarar confusiones',
    color: '#9B59B6'
  },
  { 
    name: 'Elaborate', 
    spanish: 'Elaboración (Elaborate)', 
    timeMin: 8, 
    description: 'Aplicar conceptos a contextos nuevos y profundizar el aprendizaje',
    color: '#27AE60'
  },
  { 
    name: 'Evaluate', 
    spanish: 'Evaluación (Evaluate)', 
    timeMin: 5, 
    description: 'Demostrar aprendizaje, autoevaluarse y reflexionar',
    color: '#F39C12'
  },
];

export function buildPlanSlides(pptx: PptxGenJS, data: PlanOutput, palette?: Palette, teacherInfo?: TeacherInfo) {
  if (!data?.secuencia_didactica?.bloques) return;
  
  const headerColor = palette?.primary || COLOR_ORANGE;
  
  // Add 5E Model overview slide first
  add5ESlide(pptx, headerColor);
  
  data.secuencia_didactica.bloques.forEach((bloque) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: headerColor },
    });
    slide.addText(`${bloque.nombre || ''} - ${bloque.duracion || 0} min`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 16, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
    });
    if (bloque.objetivo) {
      slide.addText(bloque.objetivo, {
        x: 0.4, y: 0.95, w: 9.2, h: 0.5,
        fontSize: 11, color: headerColor, fontFace: FONT_BODY, italic: true,
      });
    }
    if (bloque.actividad) {
      slide.addText(bloque.actividad, {
        x: 0.4, y: 1.5, w: 9.2, h: 3.5,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, valign: 'top',
      });
    }
    if (bloque.nota) {
      slide.addText(bloque.nota, {
        x: 0.4, y: 5.2, w: 9.2, h: 0.4,
        fontSize: 10, color: COLOR_SUBTLE, fontFace: FONT_BODY,
      });
    }
  });

  // Teacher info footer slide
  if (teacherInfo?.nombre) {
    const footerSlide = pptx.addSlide();
    footerSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 5.0, w: 10, h: 0.75, fill: { color: headerColor },
    });
    const dateStr = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
    footerSlide.addText(`Docente: ${teacherInfo.nombre} · ${dateStr}`, {
      x: 0, y: 5.1, w: 10, h: 0.5,
      fontSize: 10, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center', valign: 'middle',
    });
  }
}

/**
 * Add a slide explaining the 5E Instructional Model
 */
function add5ESlide(pptx: PptxGenJS, headerColor: string) {
  const slide = pptx.addSlide();
  
  // Header
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.75, fill: { color: headerColor },
  });
  slide.addText('Modelo Instruccional 5E', {
    x: 0.4, y: 0.15, w: 9.2, h: 0.45,
    fontSize: 18, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
  });

  // Total time badge
  const totalMin = PHASES_5E.reduce((sum, p) => sum + p.timeMin, 0);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 7.8, y: 0.15, w: 1.8, h: 0.45,
    fill: { color: COLOR_WHITE, transparency: 20 }, rectRadius: 0.1,
  });
  slide.addText(`${totalMin} min totales`, {
    x: 7.8, y: 0.15, w: 1.8, h: 0.45,
    fontSize: 10, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center', valign: 'middle',
  });

  // 5E phases as horizontal cards
  const cardW = 1.85;
  const cardH = 4.2;
  const startX = 0.25;
  const cardY = 1.0;
  const gap = 0.12;

  PHASES_5E.forEach((phase, i) => {
    const cx = startX + i * (cardW + gap);

    // Phase card background
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: cardY, w: cardW, h: cardH,
      fill: { color: phase.color, transparency: 90 }, rectRadius: 0.1,
      line: { color: phase.color, width: 2 },
    });

    // Phase number circle
    slide.addShape(pptx.ShapeType.ellipse, {
      x: cx + (cardW - 0.5) / 2, y: cardY + 0.15, w: 0.5, h: 0.5,
      fill: { color: phase.color },
    });
    slide.addText(String(i + 1), {
      x: cx + (cardW - 0.5) / 2, y: cardY + 0.15, w: 0.5, h: 0.5,
      fontSize: 16, bold: true, color: COLOR_WHITE, align: 'center', valign: 'middle',
    });

    // English name
    slide.addText(phase.name, {
      x: cx + 0.1, y: cardY + 0.75, w: cardW - 0.2, h: 0.35,
      fontSize: 13, bold: true, color: phase.color, align: 'center', fontFace: FONT_TITLE,
    });

    // Spanish name
    slide.addText(phase.spanish.split('(')[0].trim(), {
      x: cx + 0.1, y: cardY + 1.1, w: cardW - 0.2, h: 0.3,
      fontSize: 10, color: COLOR_TEXT, align: 'center', fontFace: FONT_BODY,
    });

    // Time badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx + (cardW - 0.9) / 2, y: cardY + 1.5, w: 0.9, h: 0.3,
      fill: { color: phase.color, transparency: 70 }, rectRadius: 0.08,
    });
    slide.addText(`${phase.timeMin} min`, {
      x: cx + (cardW - 0.9) / 2, y: cardY + 1.5, w: 0.9, h: 0.3,
      fontSize: 10, bold: true, color: phase.color, align: 'center', valign: 'middle',
    });

    // Description
    slide.addText(phase.description, {
      x: cx + 0.1, y: cardY + 1.95, w: cardW - 0.2, h: 2.1,
      fontSize: 9, color: COLOR_TEXT, align: 'center', valign: 'top', fontFace: FONT_BODY,
    });
  });
}
