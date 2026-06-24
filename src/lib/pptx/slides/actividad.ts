// slides/actividad.ts
import PptxGenJS from 'pptxgenjs';
import { FONTS, FONT_SIZES, COLORS, MARGIN, HEADER_H, CONTENT_W } from './types';
import { addPageNumber } from './cover';

interface ActividadItem {
  pregunta: string;
  espacio_respuesta?: string;  // hint about expected length
}

export interface ActividadSlideData {
  titulo: string;
  instrucciones: string;
  actividad_tipo: string;  // 'individual', 'parejas', 'grupal'
  tiempo_estimado: string;  // e.g. "10 minutos"
  preguntas: ActividadItem[];
}

export function buildActividadSlide(
  pptx: PptxGenJS,
  data: ActividadSlideData,
  slideNum: number
) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.bg };

  // Header bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: HEADER_H,
    fill: { color: COLORS.primary },
  });
  s.addText('📝 ACTIVIDAD', {
    x: MARGIN, y: 0, w: 9, h: HEADER_H,
    fontSize: 16, fontFace: FONTS.title, bold: true,
    color: COLORS.textLight, valign: 'middle',
  });

  // Title
  s.addText(data.titulo, {
    x: MARGIN, y: HEADER_H + 0.2, w: CONTENT_W, h: 0.6,
    fontSize: FONT_SIZES.slideTitle, fontFace: FONTS.title, bold: true,
    color: COLORS.text,
  });

  // Metadata badges (tipo + tiempo)
  s.addShape(pptx.ShapeType.roundRect, {
    x: MARGIN, y: HEADER_H + 0.85, w: 1.5, h: 0.3,
    fill: { color: COLORS.accent }, rectRadius: 0.05,
  });
  s.addText(data.actividad_tipo, {
    x: MARGIN, y: HEADER_H + 0.85, w: 1.5, h: 0.3,
    fontSize: 9, fontFace: FONTS.body, bold: true,
    color: COLORS.textLight, align: 'center', valign: 'middle',
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: MARGIN + 1.6, y: HEADER_H + 0.85, w: 1.3, h: 0.3,
    fill: { color: COLORS.accentAlt }, rectRadius: 0.05,
  });
  s.addText(`⏱ ${data.tiempo_estimado}`, {
    x: MARGIN + 1.6, y: HEADER_H + 0.85, w: 1.3, h: 0.3,
    fontSize: 9, fontFace: FONTS.body, bold: true,
    color: COLORS.text, align: 'center', valign: 'middle',
  });

  // Instructions
  s.addText(data.instrucciones, {
    x: MARGIN, y: HEADER_H + 1.3, w: CONTENT_W, h: 0.5,
    fontSize: 11, fontFace: FONTS.body, italic: true,
    color: COLORS.textMuted,
  });

  // Questions with answer lines
  let yPos = HEADER_H + 1.9;
  data.preguntas.forEach((q, i) => {
    s.addText(`${i + 1}. ${q.pregunta}`, {
      x: MARGIN, y: yPos, w: CONTENT_W, h: 0.3,
      fontSize: 12, fontFace: FONTS.body, bold: true,
      color: COLORS.text,
    });
    yPos += 0.35;

    // Empty answer box
    s.addShape(pptx.ShapeType.rect, {
      x: MARGIN + 0.2, y: yPos, w: CONTENT_W - 0.4, h: 0.5,
      fill: { color: COLORS.surface },
      line: { color: COLORS.border, width: 0.5 },
    });
    yPos += 0.7;
  });

  addPageNumber(s, slideNum);
}
