import PptxGenJS from 'pptxgenjs';
import { FONT_TITLE, FONT_BODY, COLOR_PURPLE, COLOR_WHITE, COLOR_TEXT } from './types';
import type { PDCOutput } from '../../../types/motor-types';

export function buildPDCSlides(pptx: PptxGenJS, data: PDCOutput) {
  if (!data?.pdc) return;
  const pdc = data.pdc;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_PURPLE };
  cover.addText('PDC Trimestral', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  if (pdc.encabezado) {
    const enc = pdc.encabezado;
    cover.addText(`${enc.materia || ''} - ${enc.nivel || ''} | Trimestre ${enc.trimestre || ''}`, {
      x: 0.5, y: 1.8, w: 9, h: 0.5,
      fontSize: 13, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
    });
  }

  if (Array.isArray(pdc.unidades) && pdc.unidades.length) {
    pdc.unidades.forEach((u) => {
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_PURPLE },
      });
      slide.addText(`Unidad ${u.numero}: ${u.titulo || ''} (${u.semanas || ''}, ${u.horas || 0}h)`, {
        x: 0.4, y: 0.15, w: 9.2, h: 0.45,
        fontSize: 14, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
      });
      slide.addText(u.objetivo_holistico || '', {
        x: 0.4, y: 0.95, w: 9.2, h: 0.5,
        fontSize: 11, color: COLOR_PURPLE, fontFace: FONT_BODY, italic: true,
      });
      const rows: Array<{ text: string; options: Record<string, unknown> }> = [];
      if (u.contenidos) {
        const contenidos = u.contenidos as Record<string, string[] | undefined>;
        (['ser', 'saber', 'hacer', 'decidir'] as const).forEach(dim => {
          const arr = contenidos[dim];
          if (Array.isArray(arr) && arr.length) {
            rows.push({ text: `${dim.toUpperCase()}: ${arr.join(', ')}`, options: { fontSize: 10, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } });
          }
        });
      }
      if (rows.length) slide.addText(rows, { x: 0.4, y: 1.5, w: 9.2, h: 4, valign: 'top' });
    });
  }
}
