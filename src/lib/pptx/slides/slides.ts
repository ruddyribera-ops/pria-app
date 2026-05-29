import PptxGenJS from 'pptxgenjs';
import { FONT_TITLE, FONT_BODY, COLOR_GREEN, COLOR_WHITE, COLOR_TEXT, COLOR_SUBTLE } from './types';
import type { SlideItem } from '../../../types/motor-types';

export function buildSlidesSlides(pptx: PptxGenJS, data: SlideItem[]) {
  if (!Array.isArray(data) || data.length === 0) return;
  data.forEach((slide) => {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_GREEN },
    });
    s.addText(`Slide ${slide.numero || 0} - [${slide.tipo || 'content'}]`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 14, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
    });
    s.addText(slide.titulo || '', {
      x: 0.4, y: 0.9, w: 9.2, h: 0.6,
      fontSize: 16, bold: true, color: COLOR_TEXT, fontFace: FONT_TITLE,
    });
    if (slide.texto_pantalla) {
      s.addText(slide.texto_pantalla, {
        x: 0.4, y: 1.6, w: 9.2, h: 3,
        fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, valign: 'top',
      });
    }
    if (slide.guion_docente) {
      s.addText(slide.guion_docente, {
        x: 0.4, y: 4.7, w: 9.2, h: 0.8,
        fontSize: 9, color: COLOR_SUBTLE, fontFace: FONT_BODY, italic: true,
      });
    }
  });
}
