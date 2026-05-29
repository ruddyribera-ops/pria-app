import PptxGenJS from 'pptxgenjs';
import { FONT_TITLE, FONT_BODY, COLOR_WHITE, COLOR_TEXT, COLOR_VIOLET } from './types';
import type { QuizOutput } from '../../../types/motor-types';

export function buildQuizSlides(pptx: PptxGenJS, data: QuizOutput) {
  if (!data?.quiz?.preguntas) return;
  data.quiz.preguntas.forEach((p) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_VIOLET },
    });
    slide.addText(`Pregunta ${p.numero} - [${p.tipo || 'escrita'}]`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 14, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
    });
    slide.addText(p.pregunta || '', {
      x: 0.4, y: 1.0, w: 9.2, h: 1.5,
      fontSize: 14, color: COLOR_TEXT, fontFace: FONT_BODY,
    });
    if (Array.isArray(p.opciones) && p.opciones.length) {
      const opts = p.opciones.map((o: string, idx: number) => ({
        text: `${String.fromCharCode(97 + idx)}) ${o}`,
        options: { fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
      }));
      slide.addText(opts, { x: 0.4, y: 2.6, w: 9.2, h: 2.5 });
    }
  });
}
