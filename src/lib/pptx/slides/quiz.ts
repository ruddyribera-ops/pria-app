import PptxGenJS from 'pptxgenjs';
import { FONTS, FONT_SIZES, COLORS, MARGIN, HEADER_H, CONTENT_W, RADIUS, SLIDE_W } from './types';
import { addPageNumber } from './cover';
import type { QuizOutput } from '../../../types/motor-types';
import type { Palette } from '../types';

/**
 * Build Quiz slides with professional card-based layout
 * 
 * Layout:
 * - Header with question number
 * - Large question card centered
 * - 4 option cards in 2x2 grid
 * - Progress indicator
 */
export function buildQuizSlides(pptx: PptxGenJS, data: QuizOutput, startNum: number = 1, palette?: Palette) {
  if (!data?.quiz?.preguntas) return;
  
  const totalQuestions = data.quiz.preguntas.length;
  
  data.quiz.preguntas.forEach((p, idx) => {
    const slideNum = startNum + idx;
    const slide = pptx.addSlide();
    slide.background = { color: palette?.bg || COLORS.bg };
    
    // Header bar with subject primary color or coral accent default
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
      fill: { color: palette?.primary || COLORS.accent },
    });
    
    // Question number badge
    slide.addText(`Pregunta ${p.numero || idx + 1}`, {
      x: MARGIN, y: 0, w: 2, h: HEADER_H,
      fontSize: 14, fontFace: FONTS.body, bold: true,
      color: COLORS.textLight, valign: 'middle',
    });
    
    // Question type badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 2.3, y: 0.12, w: 1.0, h: 0.26,
      fill: { color: COLORS.primary }, rectRadius: 0.05,
    });
    slide.addText(p.tipo || 'opción múltiple', {
      x: 2.3, y: 0.12, w: 1.0, h: 0.26,
      fontSize: 8, fontFace: FONTS.body, bold: true,
      color: COLORS.textLight, align: 'center', valign: 'middle',
    });
    
    // Progress indicator
    slide.addText(`${idx + 1}/${totalQuestions}`, {
      x: 8.5, y: 0, w: 1, h: HEADER_H,
      fontSize: 12, fontFace: FONTS.body,
      color: COLORS.textLight, valign: 'middle', align: 'right',
    });
    
    // Question card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y: HEADER_H + 0.5, w: CONTENT_W, h: 1.6,
      fill: { color: COLORS.surface }, rectRadius: RADIUS,
      shadow: { type: 'outer', blur: 6, offset: 3, color: '#000000', opacity: 0.1 },
    });
    slide.addText(p.pregunta || '', {
      x: MARGIN + 0.3, y: HEADER_H + 0.6, w: CONTENT_W - 0.6, h: 1.4,
      fontSize: FONT_SIZES.subtitle, fontFace: FONTS.body, bold: true,
      color: COLORS.text, valign: 'middle',
    });
    
    // Options in 2x2 grid
    if (Array.isArray(p.opciones) && p.opciones.length) {
      const optionPositions = [
        { x: MARGIN, y: HEADER_H + 2.3 },
        { x: MARGIN + CONTENT_W / 2 + 0.15, y: HEADER_H + 2.3 },
        { x: MARGIN, y: HEADER_H + 3.3 },
        { x: MARGIN + CONTENT_W / 2 + 0.15, y: HEADER_H + 3.3 },
      ];
      
      const optionLetters = ['A', 'B', 'C', 'D'];
      p.opciones.forEach((option: string, oi: number) => {
        if (oi >= 4) return; // Max 4 options
        
        const pos = optionPositions[oi];
        const cardW = (CONTENT_W - 0.15) / 2;
        
        // Option card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: pos.x, y: pos.y, w: cardW, h: 0.85,
          fill: { color: COLORS.textLight }, rectRadius: RADIUS,
          line: { color: COLORS.border, width: 1 },
        });
        
        // Option letter badge
        slide.addShape(pptx.ShapeType.ellipse, {
          x: pos.x + 0.15, y: pos.y + 0.25, w: 0.35, h: 0.35,
          fill: { color: COLORS.primary },
        });
        slide.addText(optionLetters[oi], {
          x: pos.x + 0.15, y: pos.y + 0.25, w: 0.35, h: 0.35,
          fontSize: 12, fontFace: FONTS.body, bold: true,
          color: COLORS.textLight, align: 'center', valign: 'middle',
        });
        
        // Option text
        slide.addText(option, {
          x: pos.x + 0.6, y: pos.y + 0.1, w: cardW - 0.75, h: 0.65,
          fontSize: FONT_SIZES.body, fontFace: FONTS.body,
          color: COLORS.text, valign: 'middle',
        });
      });
    }
    
    // Page number
    addPageNumber(slide, slideNum);
  });
}
