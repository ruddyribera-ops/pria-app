import PptxGenJS from 'pptxgenjs';
import { FONT_TITLE, FONT_BODY, COLOR_PINK, COLOR_WHITE, COLOR_SUBTLE } from './types';
import type { MicroOutput } from '../../../types/motor-types';

export function buildMicroSlides(pptx: PptxGenJS, data: MicroOutput) {
  if (!data?.micro_objetivos) return;
  const mo = data.micro_objetivos;

  const cover = pptx.addSlide();
  cover.background = { color: COLOR_PINK };
  cover.addText('Micro-Objetivos Diarios', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 26, color: COLOR_WHITE, fontFace: FONT_TITLE, bold: true, align: 'center',
  });
  cover.addText(`Unidad: ${mo.unidad || ''}`, {
    x: 0.5, y: 1.8, w: 9, h: 0.5,
    fontSize: 14, color: COLOR_WHITE, fontFace: FONT_BODY, align: 'center',
  });

  const semanas = Array.isArray(mo.semanas) ? mo.semanas : [];
  semanas.forEach((sem) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_PINK },
    });
    slide.addText(`Semana ${sem.semana}: ${sem.tema || ''}`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 15, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
    });

    const objetivos = Array.isArray(sem.objetivos_diarios) ? sem.objetivos_diarios : [];
    let y = 1.0;
    objetivos.forEach((obj) => {
      slide.addText(`Dia ${obj.dia}: ${obj.objetivo || ''}`, {
        x: 0.4, y, w: 9.2, h: 0.35,
        fontSize: 11, bold: true, color: COLOR_PINK, fontFace: FONT_BODY,
      });
      slide.addText(`  Criterio: ${obj.criterio_logro || ''} | Act: ${obj.actividad_clave || ''}`, {
        x: 0.4, y: y + 0.35, w: 9.2, h: 0.5,
        fontSize: 9, color: COLOR_SUBTLE, fontFace: FONT_BODY,
      });
      y += 0.85;
    });
  });
}
