import PptxGenJS from 'pptxgenjs';
import { addHeaderSlide } from './cover';
import { FONT_TITLE, FONT_BODY, COLOR_WHITE, COLOR_BLUE, COLOR_TEXT, COLOR_SUBTLE } from './types';
import type { ABPOutput } from '../../../types/motor-types';

export function buildABPSlides(pptx: PptxGenJS, data: ABPOutput) {
  if (!data?.proyecto) return;
  const p = data.proyecto;

  const title = pptx.addSlide();
  title.background = { color: COLOR_BLUE };
  title.addText('Proyecto ABP', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  title.addText(p.titulo || '', {
    x: 0.5, y: 1.8, w: 9, h: 1,
    fontSize: 18, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });
  if (p.pregunta_generadora) {
    title.addText(`Pregunta Generadora: ${p.pregunta_generadora}`, {
      x: 0.5, y: 3.0, w: 9, h: 0.8,
      fontSize: 13, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center', italic: true,
    });
  }

  const fases = Array.isArray(p.fases) ? p.fases : [];
  fases.forEach((fase, i) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_BLUE },
    });
    slide.addText(`${fase.nombre || `Fase ${i + 1}`} - ${fase.duracion || ''}`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 15, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
    });

    const acts = Array.isArray(fase.actividades) ? fase.actividades : [];
    const actItems = acts.map((a: string, idx: number) => ({
      text: `[${idx + 1}] ${a}`,
      options: { bullet: false, fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    if (actItems.length) {
      slide.addText(actItems, { x: 0.4, y: 1.0, w: 9.2, h: 4, valign: 'top' });
    } else {
      slide.addText('Sin actividades definidas', {
        x: 0.4, y: 1.0, w: 9.2, h: 0.5,
        fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY,
      });
    }
  });

  if (Array.isArray(p.productos) && p.productos.length) {
    const prod = addHeaderSlide(pptx, 'Productos Finales', COLOR_BLUE);
    const items = p.productos.map((pr: string) => ({
      text: pr,
      options: { bullet: true, fontSize: 13, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    prod.addText(items, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
  }
}
