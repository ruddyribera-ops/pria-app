import PptxGenJS from 'pptxgenjs';
import { 
  FONTS, FONT_SIZES, COLORS, 
  SLIDE_W, SLIDE_H, MARGIN, HEADER_H,
  PAGE_NUM_X, PAGE_NUM_Y 
} from './types';
import { getCoverCircles, getPalette } from '../designSystem';
import type { Palette } from '../types';

export interface TeacherInfo {
  nombre?: string;
  email?: string;
  escuela?: string;
}

function formatSpanishDate(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

/**
 * Build a professional cover slide with PRIA branding
 * 
 * Layout:
 * - Left panel (3.8"): Primary color with decorative circles
 * - Right area: Title, subtitle, metadata
 * - Warm white background
 * 
 * @param pptx - PptxGenJS instance
 * @param title - Slide title
 * @param subjectOrPalette - Subject name (string) or Palette object for color theming
 * @param teacherInfo - Optional teacher information to display on cover
 */
export function buildCoverSlide(
  pptx: PptxGenJS, 
  title: string, 
  subjectOrPalette?: string | Palette,
  teacherInfo?: TeacherInfo
) {
  // Resolve palette: string subject → lookup, or direct Palette object
  let pal: Palette;
  if (!subjectOrPalette) {
    pal = getPalette('');
  } else if (typeof subjectOrPalette === 'string') {
    pal = getPalette(subjectOrPalette);
  } else {
    pal = subjectOrPalette;
  }

  const slide = pptx.addSlide();
  
  // Warm white background
  slide.background = { color: pal.bg || COLORS.bg };
  
  // Left panel with subject primary color
  const panelW = 3.8;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: panelW, h: SLIDE_H,
    fill: { color: pal.primary },
  });
  
  // Decorative circles on left panel — big overlapping with alternating opacity
  const circles = getCoverCircles();
  circles.forEach((c, i) => {
    const opacity = i % 2 === 0 ? 60 : 40;  // alternating 60/40%
    slide.addShape(pptx.ShapeType.ellipse, {
      x: c.x, y: c.y, w: c.r * 2, h: c.r * 2,
      fill: { color: pal.primary, transparency: opacity },
    });
  });
  
  // PRIA badge on left panel
  slide.addText('PRIA', {
    x: 0.4, y: 4.8, w: 3, h: 0.5,
    fontSize: 24, fontFace: FONTS.title, bold: true,
    color: pal.textLight || COLORS.textLight, align: 'left',
  });
  slide.addText('Educational AI', {
    x: 0.4, y: 5.2, w: 3, h: 0.3,
    fontSize: 10, fontFace: FONTS.body,
    color: pal.textLight || COLORS.textLight, align: 'left', transparency: 30,
  });
  
  // Hero word treatment: split title into regular + giant last word
  const words = (title || 'Material Educativo').trim().split(/\s+/);
  const lastWord = words.pop() || '';
  const firstPart = words.join(' ');

  // Regular title (first part) — smaller, above hero word
  if (firstPart) {
    slide.addText(firstPart, {
      x: panelW + MARGIN, y: 1.2, w: SLIDE_W - panelW - MARGIN * 2, h: 0.8,
      fontSize: 36, fontFace: FONTS.title, bold: true,
      color: COLORS.text, align: 'left', valign: 'middle',
    });
  }

  // Hero word (last word) — GIANT in primary color
  if (lastWord) {
    slide.addText(lastWord, {
      x: panelW + MARGIN, y: 2.0, w: SLIDE_W - panelW - MARGIN * 2, h: 2.5,
      fontSize: 90, fontFace: FONTS.title, bold: true,
      color: pal.primary, align: 'left', valign: 'middle',
      charSpacing: -2,
    });
  }

  // Subtitle / subject line (show subject name if provided as string)
  const subjectLabel = typeof subjectOrPalette === 'string' ? subjectOrPalette : '';
  if (subjectLabel) {
    slide.addText(subjectLabel, {
      x: panelW + MARGIN, y: 4.7, w: SLIDE_W - panelW - MARGIN * 2, h: 0.5,
      fontSize: FONT_SIZES.subtitle, fontFace: FONTS.body,
      color: COLORS.textMuted, align: 'left',
    });
  }
  
  // Spanish date — top-right position like reference samples
  slide.addText(formatSpanishDate(new Date()), {
    x: SLIDE_W - MARGIN - 3, y: 0.4, w: 3, h: 0.35,
    fontSize: FONT_SIZES.caption, fontFace: FONTS.body,
    color: COLORS.textMuted, align: 'right',
  });
  
  // Teacher info (if provided) — positioned below subject/subtitle
  if (teacherInfo) {
    const teacherY = 5.25;
    if (teacherInfo.nombre) {
      slide.addText(teacherInfo.nombre, {
        x: panelW + MARGIN, y: teacherY, w: SLIDE_W - panelW - MARGIN * 2, h: 0.3,
        fontSize: 11, fontFace: FONTS.body, bold: true,
        color: pal.primary, align: 'left',
      });
    }
    const contactY = teacherY + 0.3;
    const contactParts: string[] = [];
    if (teacherInfo.email) contactParts.push(teacherInfo.email);
    if (teacherInfo.escuela) contactParts.push(teacherInfo.escuela);
    if (contactParts.length > 0) {
      slide.addText(contactParts.join(' · '), {
        x: panelW + MARGIN, y: contactY, w: SLIDE_W - panelW - MARGIN * 2, h: 0.25,
        fontSize: 9, fontFace: FONTS.body,
        color: COLORS.textMuted, align: 'left',
      });
    }
  }
  
  // Generated by badge (use accent from palette or default)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: panelW + MARGIN, y: 5.65, w: 2.2, h: 0.35,
    fill: { color: pal.accent || COLORS.accent }, rectRadius: 0.08,
  });
  slide.addText('Generado por IA', {
    x: panelW + MARGIN, y: 5.65, w: 2.2, h: 0.35,
    fontSize: 9, fontFace: FONTS.body, bold: true,
    color: pal.textLight || COLORS.textLight, align: 'center', valign: 'middle',
  });
}

/**
 * Build a simple credits slide
 */
export function buildCreditsSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bg };
  
  // Center content
  slide.addText('PRIA v10', {
    x: 0, y: 1.8, w: SLIDE_W, h: 1,
    fontSize: 40, fontFace: FONTS.title, bold: true,
    color: COLORS.primary, align: 'center',
  });
  
  slide.addText('Sistema de Planificación Docente con IA', {
    x: 0, y: 2.9, w: SLIDE_W, h: 0.5,
    fontSize: FONT_SIZES.subtitle, fontFace: FONTS.body,
    color: COLORS.textMuted, align: 'center',
  });
  
  // Decorative line
  slide.addShape(pptx.ShapeType.rect, {
    x: SLIDE_W / 2 - 1, y: 3.6, w: 2, h: 0.04,
    fill: { color: COLORS.accent },
  });
  
  slide.addText('www.pria.app', {
    x: 0, y: 4.0, w: SLIDE_W, h: 0.4,
    fontSize: FONT_SIZES.caption, fontFace: FONTS.body,
    color: COLORS.textMuted, align: 'center',
  });
}

/**
 * Add a standard header bar to a slide
 * Returns the slide for further content
 * 
 * @param pptx - PptxGenJS instance
 * @param title - Header title text
 * @param color - Optional explicit color string (overrides palette)
 * @param slideNumber - Optional slide number badge
 * @param palette - Optional Palette object for subject-based color
 */
export function addHeaderSlide(
  pptx: PptxGenJS, 
  title: string, 
  color?: string,
  slideNumber?: number,
  palette?: Palette
): PptxGenJS.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: palette?.bg || COLORS.bg };
  
  // Prefer explicit color, then palette.primary, then default
  const headerColor = color || palette?.primary || COLORS.primary;
  
  // Header bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
    fill: { color: headerColor },
  });
  
  // Title
  slide.addText(title, {
    x: MARGIN, y: 0, w: SLIDE_W - MARGIN * 2 - (slideNumber ? 1 : 0), h: HEADER_H,
    fontSize: 16, fontFace: FONTS.title, bold: true,
    color: COLORS.textLight, valign: 'middle',
  });
  
  // Slide number badge (if provided)
  if (slideNumber !== undefined) {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: PAGE_NUM_X - 0.15, y: PAGE_NUM_Y - 0.15, w: 0.4, h: 0.4,
      fill: { color: COLORS.surface },
    });
    slide.addText(String(slideNumber), {
      x: PAGE_NUM_X - 0.15, y: PAGE_NUM_Y - 0.15, w: 0.4, h: 0.4,
      fontSize: FONT_SIZES.pageNumber, fontFace: FONTS.body, bold: true,
      color: COLORS.textMuted, align: 'center', valign: 'middle',
    });
  }
  
  return slide;
}

/**
 * Add a page number badge to any slide
 */
export function addPageNumber(slide: PptxGenJS.Slide, num: number): void {
  slide.addShape('ellipse' as unknown as PptxGenJS.ShapeType, {
    x: PAGE_NUM_X - 0.15, y: PAGE_NUM_Y - 0.15, w: 0.4, h: 0.4,
    fill: { color: COLORS.surface },
  });
  slide.addText(String(num), {
    x: PAGE_NUM_X - 0.15, y: PAGE_NUM_Y - 0.15, w: 0.4, h: 0.4,
    fontSize: FONT_SIZES.pageNumber, fontFace: FONTS.body, bold: true,
    color: COLORS.textMuted, align: 'center', valign: 'middle',
  });
}
