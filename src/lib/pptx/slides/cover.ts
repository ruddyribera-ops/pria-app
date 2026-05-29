import PptxGenJS from 'pptxgenjs';
import { FONT_TITLE, FONT_BODY, COLOR_BG, COLOR_ACCENT, COLOR_WHITE, COLOR_SUBTLE } from './types';

export function buildCoverSlide(pptx: PptxGenJS, title: string) {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  slide.addText(title || 'Material Educativo', {
    x: 0.5, y: 1.5, w: 9, h: 2,
    fontSize: 36, color: COLOR_WHITE, fontFace: FONT_TITLE,
    bold: true, align: 'center',
  });
  slide.addText('Generado por PRIA v10', {
    x: 0.5, y: 3.5, w: 9, h: 0.6,
    fontSize: 14, color: COLOR_ACCENT, fontFace: FONT_BODY, align: 'center',
  });
  slide.addText(new Date().toLocaleDateString('es-BO'), {
    x: 0.5, y: 4.2, w: 9, h: 0.4,
    fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY, align: 'center',
  });
}

export function buildCreditsSlide(pptx: PptxGenJS) {
  const credits = pptx.addSlide();
  credits.background = { color: COLOR_BG };
  credits.addText('Generado por PRIA v10', {
    x: 0.5, y: 2, w: 9, h: 1.5,
    fontSize: 28, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  credits.addText('Sistema de Planificacion Docente con IA', {
    x: 0.5, y: 3.5, w: 9, h: 0.6,
    fontSize: 14, color: COLOR_ACCENT, fontFace: FONT_BODY, align: 'center',
  });
}

export function addHeaderSlide(pptx: PptxGenJS, title: string, color: string): PptxGenJS.Slide {
  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.75, fill: { color },
  });
  slide.addText(title, {
    x: 0.4, y: 0.15, w: 9.2, h: 0.45,
    fontSize: 16, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE,
    valign: 'middle',
  });
  return slide;
}
