import PptxGenJS from 'pptxgenjs';
import { addHeaderSlide } from './cover';
import { FONT_TITLE, FONT_BODY, COLOR_RED, COLOR_TEXT } from './types';
import type { FichaOutput } from '../../../types/motor-types';

export function buildFichaSlides(pptx: PptxGenJS, data: FichaOutput) {
  if (!data?.ficha_trabajo) return;
  const ft = data.ficha_trabajo;

  const intro = pptx.addSlide();
  intro.background = { color: COLOR_RED };
  intro.addText('Ficha Gamificada', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: '#FFFFFF', fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  intro.addText(ft.titulo_gancho || '', {
    x: 0.5, y: 1.8, w: 9, h: 0.8,
    fontSize: 18, color: '#FFFFFF', fontFace: FONT_BODY, align: 'center',
  });
  intro.addText((ft.historia_gancho || '').slice(0, 300), {
    x: 0.5, y: 2.8, w: 9, h: 1.5,
    fontSize: 12, color: '#FFFFFF', fontFace: FONT_BODY, align: 'center',
  });

  const misiones = ft.misiones || {};
  if (Array.isArray(misiones.oraculo) && misiones.oraculo.length) {
    const slide = addHeaderSlide(pptx, 'Oraculo - Pregunta de Investigacion', COLOR_RED);
    misiones.oraculo.forEach((m, i) => {
      slide.addText(`${i + 1}. ${m.pregunta || ''}`, {
        x: 0.4, y: 1.0 + i * 0.8, w: 9.2, h: 0.7,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }

  if (Array.isArray(misiones.puente) && misiones.puente.length) {
    const slide = addHeaderSlide(pptx, 'Puente - Emparejar', COLOR_RED);
    misiones.puente.forEach((p, i) => {
      slide.addText(`${p.palabra}: ${p.significado}`, {
        x: 0.4, y: 1.0 + i * 0.6, w: 9.2, h: 0.5,
        fontSize: 12, color: COLOR_TEXT, fontFace: FONT_BODY,
      });
    });
  }

  if (misiones.pergamino) {
    const slide = addHeaderSlide(pptx, 'Pergamino - Completar', COLOR_RED);
    slide.addText(misiones.pergamino.frase_con_espacios || '', {
      x: 0.4, y: 1.0, w: 9.2, h: 0.8,
      fontSize: 13, color: COLOR_TEXT, fontFace: FONT_BODY,
    });
    slide.addText('Palabras: ' + (misiones.pergamino.palabras_secretas || []).join(', '), {
      x: 0.4, y: 1.9, w: 9.2, h: 0.5,
      fontSize: 10, color: COLOR_RED, fontFace: FONT_BODY,
    });
  }
}
