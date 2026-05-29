import PptxGenJS from 'pptxgenjs';
import { FONT_TITLE, FONT_BODY, COLOR_ORANGE, COLOR_WHITE, COLOR_TEXT, COLOR_SUBTLE } from './types';
import type { PlanOutput } from '../../../types/motor-types';

export function buildPlanSlides(pptx: PptxGenJS, data: PlanOutput) {
  if (!data?.secuencia_didactica?.bloques) return;
  data.secuencia_didactica.bloques.forEach((bloque) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_ORANGE },
    });
    slide.addText(`${bloque.nombre || ''} - ${bloque.duracion || 0} min`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 16, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
    });
    if (bloque.objetivo) {
      slide.addText(bloque.objetivo, {
        x: 0.4, y: 0.95, w: 9.2, h: 0.5,
        fontSize: 11, color: COLOR_ORANGE, fontFace: FONT_BODY, italic: true,
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
}
