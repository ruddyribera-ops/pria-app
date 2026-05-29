import PptxGenJS from 'pptxgenjs';
import { FONT_TITLE, FONT_BODY, COLOR_WHITE, COLOR_TEXT, COLOR_PURPLE, COLOR_SUBTLE } from './types';
import type { AssessmentOutput } from '../../../types/motor-types';

export function buildAssessmentSlides(pptx: PptxGenJS, data: AssessmentOutput) {
  if (!data?.evaluacion) return;
  const ev = data.evaluacion;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_PURPLE };
  cover.addText('Rubrica y Evaluacion', {
    x: 0.5, y: 1, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  cover.addText(`Proyecto: ${ev.proyecto || ''}`, {
    x: 0.5, y: 2, w: 9, h: 0.5,
    fontSize: 14, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });

  if (ev.rubrica?.criterios) {
    ev.rubrica.criterios.forEach((c) => {
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_PURPLE },
      });
      slide.addText(`${c.nombre} (${c.peso || ''})`, {
        x: 0.4, y: 0.15, w: 9.2, h: 0.45,
        fontSize: 15, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
      });
      const niveles = c.niveles || {};
      const rows = [
        { text: 'Excelente:', options: { bold: true, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } },
        { text: String(niveles.excelente || ''), options: { fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY, breakLine: true } },
        { text: '', options: { fontSize: 6, breakLine: true } },
        { text: 'Suficiente:', options: { bold: true, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } },
        { text: String(niveles.suficiente || ''), options: { fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY, breakLine: true } },
        { text: '', options: { fontSize: 6, breakLine: true } },
        { text: 'En Desarrollo:', options: { bold: true, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } },
        { text: String(niveles.en_desarrollo || ''), options: { fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY, breakLine: true } },
        { text: '', options: { fontSize: 6, breakLine: true } },
        { text: 'Inicial:', options: { bold: true, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } },
        { text: String(niveles.inicial || ''), options: { fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY, breakLine: true } },
      ];
      slide.addText(rows, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
    });
  }
}
