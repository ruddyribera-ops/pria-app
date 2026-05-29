import PptxGenJS from 'pptxgenjs';
import { addHeaderSlide } from './cover';
import { FONT_TITLE, FONT_BODY, COLOR_ORANGE, COLOR_TEXT } from './types';
import type { RecalibrateOutput } from '../../../types/motor-types';

export function buildRecalibrationSlides(pptx: PptxGenJS, data: RecalibrateOutput) {
  if (!data?.recalibracion) return;
  const r = data.recalibracion;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_ORANGE };
  cover.addText('Recalibracion Adaptativa', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: '#FFFFFF', fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  cover.addText((r.diagnostico_general || '').slice(0, 300), {
    x: 0.5, y: 1.8, w: 9, h: 1.5,
    fontSize: 13, color: '#FFFFFF', fontFace: FONT_BODY, align: 'center',
  });

  if (Array.isArray(r.fortalezas) && r.fortalezas.length) {
    const f = addHeaderSlide(pptx, 'Fortalezas', COLOR_ORANGE);
    const items = r.fortalezas.map((fw: string) => ({
      text: fw,
      options: { bullet: true, fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    f.addText(items, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
  }

  if (Array.isArray(r.areas_mejora) && r.areas_mejora.length) {
    const am = addHeaderSlide(pptx, 'Areas de Mejora', COLOR_ORANGE);
    const items = r.areas_mejora.map((a: string) => ({
      text: a,
      options: { bullet: true, fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    am.addText(items, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
  }

  if (Array.isArray(r.ajustes_sugeridos) && r.ajustes_sugeridos.length) {
    const as = addHeaderSlide(pptx, 'Ajustes Sugeridos', COLOR_ORANGE);
    r.ajustes_sugeridos.forEach((a, i) => {
      as.addText(`${i + 1}. [${a.area}] ${a.accion}`, {
        x: 0.4, y: 1.0 + i * 0.8, w: 9.2, h: 0.7,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }
}
