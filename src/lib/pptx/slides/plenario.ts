// slides/plenario.ts
import PptxGenJS from 'pptxgenjs';
import { FONTS, COLORS, MARGIN, CONTENT_W } from './types';
import { addPageNumber } from './cover';

export interface PlenarioSlideData {
  tema: string;
  mensajes_clave: string[];  // 3 key takeaways
  pregunta_plenario: string;  // closing discussion question
  motivacion_final: string;   // motivational quote
}

export function buildPlenarioSlide(
  pptx: PptxGenJS,
  data: PlenarioSlideData,
  slideNum: number
) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.bg };

  // Header
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.6,
    fill: { color: COLORS.primary },
  });
  s.addText('🎯 PLENARIO — Cierre de la clase', {
    x: MARGIN, y: 0, w: 9, h: 0.6,
    fontSize: 18, fontFace: FONTS.title, bold: true,
    color: COLORS.textLight, valign: 'middle',
  });

  // Theme title
  s.addText(`Tema: ${data.tema}`, {
    x: MARGIN, y: 0.9, w: CONTENT_W, h: 0.5,
    fontSize: 22, fontFace: FONTS.title, bold: true,
    color: COLORS.primary,
  });

  // Key takeaways as numbered cards
  s.addText('MENSAJES CLAVE', {
    x: MARGIN, y: 1.6, w: CONTENT_W, h: 0.3,
    fontSize: 12, fontFace: FONTS.body, bold: true,
    color: COLORS.textMuted,
  });

  let yPos = 2.0;
  data.mensajes_clave.forEach((msg, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y: yPos, w: CONTENT_W, h: 0.55,
      fill: { color: COLORS.surface }, rectRadius: 0.1,
      shadow: { type: 'outer', blur: 3, offset: 1, color: '#000000', opacity: 0.06 },
    });
    s.addShape(pptx.ShapeType.ellipse, {
      x: MARGIN + 0.15, y: yPos + 0.12, w: 0.32, h: 0.32,
      fill: { color: COLORS.primary },
    });
    s.addText(`${i + 1}`, {
      x: MARGIN + 0.15, y: yPos + 0.12, w: 0.32, h: 0.32,
      fontSize: 11, fontFace: FONTS.body, bold: true,
      color: COLORS.textLight, align: 'center', valign: 'middle',
    });
    s.addText(msg, {
      x: MARGIN + 0.6, y: yPos, w: CONTENT_W - 0.7, h: 0.55,
      fontSize: 13, fontFace: FONTS.body,
      color: COLORS.text, valign: 'middle',
    });
    yPos += 0.65;
  });

  // Discussion question
  s.addShape(pptx.ShapeType.roundRect, {
    x: MARGIN, y: 4.2, w: CONTENT_W, h: 0.7,
    fill: { color: '#FFFBEB' },
    line: { color: COLORS.accentAlt, width: 1 },
    rectRadius: 0.1,
  });
  s.addText('💬 PARA DISCUTIR EN CLASE', {
    x: MARGIN + 0.2, y: 4.25, w: CONTENT_W - 0.4, h: 0.25,
    fontSize: 10, fontFace: FONTS.body, bold: true,
    color: COLORS.accentAlt,
  });
  s.addText(data.pregunta_plenario, {
    x: MARGIN + 0.2, y: 4.5, w: CONTENT_W - 0.4, h: 0.4,
    fontSize: 12, fontFace: FONTS.body, italic: true,
    color: COLORS.text,
  });

  // Motivational banner
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.05, w: 10, h: 0.55,
    fill: { color: COLORS.accent },
  });
  s.addText(data.motivacion_final, {
    x: MARGIN, y: 5.05, w: CONTENT_W, h: 0.55,
    fontSize: 14, fontFace: FONTS.body, bold: true,
    color: COLORS.textLight, align: 'center', valign: 'middle',
  });

  addPageNumber(s, slideNum);
}
