import PptxGenJS from 'pptxgenjs';
import { addHeaderSlide } from './cover';
import { FONT_TITLE, FONT_BODY, COLOR_ACCENT, COLOR_WHITE, COLOR_TEXT, COLOR_BLUE, COLOR_SUBTLE } from './types';
import type { SynthesisOutput } from '../../../types/motor-types';

export function buildSynthesisSlides(pptx: PptxGenJS, data: SynthesisOutput) {
  if (!data?.unidad_sintetizada) return;
  const s = data.unidad_sintetizada;

  const overview = addHeaderSlide(pptx, 'Sintesis Neuro-Inclusiva', COLOR_ACCENT);
  overview.addText(s.titulo || '', {
    x: 0.4, y: 1.0, w: 9.2, h: 0.8,
    fontSize: 18, bold: true, color: COLOR_TEXT, fontFace: FONT_TITLE,
  });
  overview.addText(`Enfoque: ${s.enfoque_didactico || 'N/A'}`, {
    x: 0.4, y: 1.85, w: 9.2, h: 0.4,
    fontSize: 12, color: COLOR_ACCENT, fontFace: FONT_BODY,
  });
  if (s.proyecto_pbl) {
    overview.addText(`Proyecto ABP: ${String(s.proyecto_pbl).slice(0, 150)}`, {
      x: 0.4, y: 2.35, w: 9.2, h: 0.5,
      fontSize: 11, color: COLOR_SUBTLE, fontFace: FONT_BODY,
    });
  }

  const temas = Array.isArray(s.temas_desarrollados) ? s.temas_desarrollados : [];
  temas.forEach((tema, i) => {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.75, fill: { color: COLOR_ACCENT },
    });
    slide.addText(`${i + 1}. ${tema.nombre || ''}`, {
      x: 0.4, y: 0.15, w: 9.2, h: 0.45,
      fontSize: 16, bold: true, color: COLOR_WHITE, fontFace: FONT_TITLE, valign: 'middle',
    });

    const intel = Array.isArray(tema.inteligencias_sugeridas)
      ? tema.inteligencias_sugeridas.join(' | ')
      : '';
    if (intel) {
      slide.addText(`[${intel}]`, {
        x: 0.4, y: 0.9, w: 9.2, h: 0.35,
        fontSize: 9, color: COLOR_ACCENT, fontFace: FONT_BODY,
      });
    }

    if (Array.isArray(tema.conceptos_clave)) {
      slide.addText('Conceptos: ' + tema.conceptos_clave.join(', '), {
        x: 0.4, y: 1.3, w: 9.2, h: 0.5,
        fontSize: 10, color: COLOR_BLUE, fontFace: FONT_BODY,
      });
    }

    if (Array.isArray(tema.actividades)) {
      const acts = (tema.actividades || []).map((a: string | { tipo: string; inteligencia: string }, idx: number) => {
        const text = typeof a === 'string' ? a : `${a.tipo || ''}: ${a.inteligencia || ''}`;
        return { text: `[${idx + 1}] ${text}`, options: { bullet: false, fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, breakLine: true } };
      });
      slide.addText(acts, { x: 0.4, y: 1.9, w: 9.2, h: 3, valign: 'top' });
    }
  });

  // DUA adaptaciones (runtime extension)
  const duaData = (data as unknown as Record<string, unknown>).adaptaciones_dua as
    | { representacion?: string[]; expresion?: string[]; compromiso?: string[] }
    | undefined;
  if (duaData) {
    const dua = addHeaderSlide(pptx, 'Adaptaciones DUA', COLOR_ACCENT);
    const rows = [
      ...((duaData.representacion || []).map((r: string) => `Representacion: ${r}`)),
      ...((duaData.expresion || []).map((e: string) => `Expresion: ${e}`)),
      ...((duaData.compromiso || []).map((c: string) => `Compromiso: ${c}`)),
    ];
    if (rows.length) {
      dua.addText(rows.join('\n'), {
        x: 0.4, y: 1.0, w: 9.2, h: 4.5,
        fontSize: 11, color: COLOR_TEXT, fontFace: FONT_BODY, valign: 'top',
      });
    }
  }
}
