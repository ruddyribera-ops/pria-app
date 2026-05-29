import PptxGenJS from 'pptxgenjs';
import { addHeaderSlide } from './cover';
import { FONT_TITLE, FONT_BODY, COLOR_CYAN, COLOR_WHITE, COLOR_TEXT } from './types';
import type { TutorOutput } from '../../../types/motor-types';

export function buildTutorSlides(pptx: PptxGenJS, data: TutorOutput) {
  if (!data?.panel_tutor) return;
  const pt = data.panel_tutor;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_CYAN };
  cover.addText('Panel del Tutor', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  cover.addText(pt.resumen_clase || '', {
    x: 0.5, y: 1.8, w: 9, h: 1,
    fontSize: 14, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });

  if (Array.isArray(pt.puntos_clave) && pt.puntos_clave.length) {
    const pk = addHeaderSlide(pptx, 'Puntos Clave', COLOR_CYAN);
    const items = pt.puntos_clave.map((p: string) => ({
      text: p,
      options: { bullet: true, fontSize: 13, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true },
    }));
    pk.addText(items, { x: 0.4, y: 1.0, w: 9.2, h: 4.5, valign: 'top' });
  }

  if (Array.isArray(pt.momentos_criticos) && pt.momentos_criticos.length) {
    const mc = addHeaderSlide(pptx, 'Momentos Criticos', COLOR_CYAN);
    pt.momentos_criticos.forEach((m, i) => {
      mc.addText(`${i + 1}. ${m.momento}: ${m.accion}`, {
        x: 0.4, y: 1.0 + i * 0.8, w: 9.2, h: 0.7,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }

  if (Array.isArray(pt.preguntas_frecuentes) && pt.preguntas_frecuentes.length) {
    const pf = addHeaderSlide(pptx, 'Preguntas Frecuentes', COLOR_CYAN);
    pt.preguntas_frecuentes.forEach((p, i) => {
      pf.addText(`P: ${p.pregunta}`, {
        x: 0.4, y: 1.0 + i * 0.8, w: 9.2, h: 0.4,
        fontSize: 11, bold: true, color: COLOR_CYAN, fontFace: FONT_BODY,
      });
      pf.addText(`   R: ${p.respuesta_breve || ''}`, {
        x: 0.4, y: 1.35 + i * 0.8, w: 9.2, h: 0.4,
        fontSize: 10, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }
}
