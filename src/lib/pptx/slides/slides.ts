import PptxGenJS from 'pptxgenjs';
import { FONTS, FONT_SIZES } from './types';
import { PALETTES, TIPO_TEMPLATES, BRAND, detectMateria, getPalette, type Palette } from './design-system';
import { addPageNumber } from './cover';
import { drawBoliviaWaterScene } from './boliviaScenes';
import type { SlideItem } from '../../../types/motor-types';

// ── Layout constants ──
const SLIDE_W = 10;
const SLIDE_H = 5.625;
const MARGIN = 0.5;
const HEADER_H = 0.7;
const CONTENT_W = SLIDE_W - MARGIN * 2;
const RADIUS = 0.15;

export interface BuildSlidesOptions {
  subject?: string;
  teacherEmail?: string;
  startNum?: number;
  materia?: keyof typeof PALETTES;
  palette?: Palette;
}

// ─── Decoration helpers ─────────────────────────────────────────────────────

function drawCircles(pptx: PptxGenJS, slide: any, palette: Palette) {
  // 3 decorative circles in upper-right corner
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.5, y: -0.5, w: 2.5, h: 2.5,
    fill: { color: palette.secondary, transparency: 75 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 9.0, y: 1.5, w: 1.8, h: 1.8,
    fill: { color: palette.accent, transparency: 80 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 7.5, y: 3.5, w: 1.2, h: 1.2,
    fill: { color: palette.primary, transparency: 85 },
  });
}

function drawDots(pptx: PptxGenJS, slide: any, palette: Palette) {
  // 5x5 grid of small dots (pausa activa — energetic)
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 0.2 + j * 0.18, y: 4.2 + i * 0.18, w: 0.08, h: 0.08,
        fill: { color: palette.accent, transparency: 50 },
      });
    }
  }
}

function drawWave(pptx: PptxGenJS, slide: any, palette: Palette) {
  // Bottom decorative wave for cierre
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.3, w: 10, h: 0.325,
    fill: { color: palette.secondary, transparency: 70 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.45, w: 10, h: 0.175,
    fill: { color: palette.accent, transparency: 60 },
  });
}

// ─── Header helpers ─────────────────────────────────────────────────────────

function drawHeader(pptx: PptxGenJS, slide: any, palette: Palette, slideNum: number, total: number) {
  // Gradient bar (2 stacked rects simulating gradient)
  const gradient = palette.gradient ?? [palette.primary, palette.primaryDark ?? palette.primary];
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: HEADER_H / 2,
    fill: { color: gradient[0] },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: HEADER_H / 2, w: SLIDE_W, h: HEADER_H / 2,
    fill: { color: gradient[1] },
  });

  // Brand mark (left)
  slide.addText('■ PRIA', {
    x: 0.3, y: 0.05, w: 2.5, h: HEADER_H - 0.1,
    fontSize: 18, fontFace: FONTS.titleFallback, bold: true,
    color: palette.textLight, valign: 'middle', charSpacing: 1,
  });

  // Slide counter (right)
  slide.addText(`${slideNum} / ${total}`, {
    x: 9.0, y: 0.05, w: 0.9, h: HEADER_H - 0.1,
    fontSize: 11, fontFace: FONTS.bodyFallback,
    color: palette.textLight, align: 'right', valign: 'middle',
  });
}

function drawFooter(_pptx: PptxGenJS, slide: any, palette: Palette, subject?: string) {
  const footerText = subject
    ? `${BRAND.tagline}  ·  ${subject}`
    : BRAND.tagline;
  slide.addText(footerText, {
    x: 0, y: SLIDE_H - 0.55, w: SLIDE_W, h: 0.25,
    fontSize: 9, fontFace: FONTS.bodyFallback,
    color: palette.textMuted, align: 'center', valign: 'middle',
    italic: true,
  });
}

// ─── Title helpers ──────────────────────────────────────────────────────────

function drawTitle(_pptx: PptxGenJS, slide: any, palette: Palette, title: string, position: 'center' | 'left') {
  if (position === 'center') {
    slide.addText(title, {
      x: 0.5, y: 1.5, w: SLIDE_W - 1, h: 1.8,
      fontSize: 44, fontFace: FONTS.titleFallback, bold: true,
      color: palette.text, align: 'center', valign: 'middle',
      lineSpacingMultiple: 1.1,
    });
  } else {
    slide.addText(title, {
      x: MARGIN, y: HEADER_H + 0.25, w: CONTENT_W, h: 0.8,
      fontSize: FONT_SIZES.slideTitle, fontFace: FONTS.titleFallback, bold: true,
      color: palette.primary,
      valign: 'top',
    });
  }
}

function drawBadge(pptx: PptxGenJS, slide: any, palette: Palette, badgeText: string, badgeColor: 'primary' | 'secondary' | 'accent' | 'warm') {
  const color = palette[badgeColor];
  slide.addShape(pptx.ShapeType.roundRect, {
    x: MARGIN, y: HEADER_H + 0.1, w: 1.8, h: 0.32,
    fill: { color }, rectRadius: 0.06,
  });
  slide.addText(badgeText, {
    x: MARGIN, y: HEADER_H + 0.1, w: 1.8, h: 0.32,
    fontSize: 9, fontFace: FONTS.bodyFallback, bold: true,
    color: palette.textLight, align: 'center', valign: 'middle',
    charSpacing: 1.5,
  });
}

// ─── Card helpers ───────────────────────────────────────────────────────────

function drawContentCard(
  pptx: PptxGenJS,
  slide: any,
  palette: Palette,
  text: string,
  y: number,
  h: number,
  withShadow: boolean = true
) {
  if (withShadow) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y: y, w: CONTENT_W, h: h,
      fill: { color: palette.surface }, rectRadius: RADIUS,
      shadow: { type: 'outer', blur: 6, offset: 2, color: '#000000', opacity: 0.08 },
      line: { color: palette.primary, width: 0.5 },
    });
  } else {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y: y, w: CONTENT_W, h: h,
      fill: { color: palette.surface }, rectRadius: RADIUS,
      line: { color: palette.border || '#E5E5E0', width: 0.5 },
    });
  }
  slide.addText(text, {
    x: MARGIN + 0.3, y: y + 0.2, w: CONTENT_W - 0.6, h: h - 0.4,
    fontSize: FONT_SIZES.body, fontFace: FONTS.bodyFallback,
    color: palette.text, valign: 'top',
    paraSpaceBefore: 4, paraSpaceAfter: 4,
    lineSpacingMultiple: 1.3,
  });
}

// ─── BLOOM'S VERBS for objetivos ────────────────────────────────────────────

const BLOOM_VERBS = ['Recordar', 'Comprender', 'Aplicar', 'Analizar', 'Sintetizar', 'Evaluar'];

// ─── P1-3: Water cycle diagram builder ──────────────────────────────────────

const WATER_CYCLE_KEYWORDS = /agua|water|ciclo|evaporación|condensación|precipitación|infiltración|escorrentía|lluvia|nube|río|lago|glaciar|sublimación|transpiración/i;

function buildWaterCycleDiagram(pptx: PptxGenJS, slide: any, palette: Palette, stage: string) {
  const stageLower = (stage || '').toLowerCase();
  const cx = 7.5; // right side of slide — centered in right third
  const cy = 1.3;

  // ── Sun (top-right) ──
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx + 0.6, y: cy, w: 0.5, h: 0.5,
    fill: { color: 'FCD34D' },
  });
  // Sun rays — 6 short lines
  const rayAngles = [0, 60, 120, 180, 240, 300];
  rayAngles.forEach(deg => {
    const rad = (deg * Math.PI) / 180;
    const x1 = cx + 0.85 + 0.35 * Math.cos(rad);
    const y1 = cy + 0.25 + 0.35 * Math.sin(rad);
    const x2 = cx + 0.85 + 0.55 * Math.cos(rad);
    const y2 = cy + 0.25 + 0.55 * Math.sin(rad);
    slide.addShape(pptx.ShapeType.line, {
      x: x1, y: y1, w: x2 - x1, h: y2 - y1,
      line: { color: 'F59E0B', width: 1.5 },
    });
  });

  // ── Cloud (mid-right) ──
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx + 0.2, y: cy + 1.2, w: 1.4, h: 0.5,
    fill: { color: 'E2E8F0' },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx + 0.5, y: cy + 1.0, w: 0.8, h: 0.4,
    fill: { color: 'E2E8F0' },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx + 0.0, y: cy + 1.05, w: 0.6, h: 0.4,
    fill: { color: 'E2E8F0' },
  });

  // ── Arrows ──
  // Up arrow (evaporation/condensation)
  slide.addText('↑', {
    x: cx + 0.65, y: cy + 0.55, w: 0.4, h: 0.5,
    fontSize: 20, color: '0EA5E9', align: 'center', bold: true,
  });
  // Down arrow (precipitation)
  slide.addText('↓', {
    x: cx + 0.65, y: cy + 1.7, w: 0.4, h: 0.5,
    fontSize: 20, color: '0EA5E9', align: 'center', bold: true,
  });

  // ── Rain drops ──
  for (let i = 0; i < 3; i++) {
    slide.addText('•', {
      x: cx + 0.25 + i * 0.45, y: cy + 2.0, w: 0.3, h: 0.3,
      fontSize: 24, color: '3B82F6', align: 'center',
    });
  }

  // ── Ground / Earth layers ──
  slide.addShape(pptx.ShapeType.rect, {
    x: cx - 0.1, y: cy + 2.4, w: 2.0, h: 0.15,
    fill: { color: '92400E' },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: cx - 0.1, y: cy + 2.55, w: 2.0, h: 0.15,
    fill: { color: '78350F' },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: cx - 0.1, y: cy + 2.7, w: 2.0, h: 0.15,
    fill: { color: '451A03' },
  });

  // ── Highlight the current stage ──
  const stageIndicators: Record<string, number> = {
    evaporación: 0, evaporacion: 0,
    condensación: 1, condensacion: 1,
    precipitación: 2, precipitacion: 2,
    infiltración: 3, infiltracion: 3,
    escorrentía: 4, escorrentia: 4,
  };
  const stageIdx = stageIndicators[stageLower];
  if (stageIdx !== undefined) {
    // Draw a subtle highlight rectangle around the relevant part
    const highlightAreas = [
      { label: 'Evapora', x: cx + 0.3, y: cy + 0.0 },  // near sun
      { label: 'Condensa', x: cx + 0.2, y: cy + 0.8 },  // near cloud
      { label: 'Precipita', x: cx + 0.1, y: cy + 1.8 }, // near rain
      { label: 'Infiltr.', x: cx + 0.5, y: cy + 2.3 },  // near ground
      { label: 'Escurre', x: cx + 1.5, y: cy + 2.3 },   // near ground right
    ];
    const area = highlightAreas[stageIdx];
    if (area) {
      slide.addText('→ ' + area.label, {
        x: area.x, y: area.y, w: 1.2, h: 0.3,
        fontSize: 8, fontFace: FONTS.bodyFallback, bold: true,
        color: palette.primary, align: 'left',
      });
    }
  }
}

// ─── MAIN BUILDER ───────────────────────────────────────────────────────────

export function buildSlidesSlides(
  pptx: PptxGenJS,
  data: SlideItem[],
  options: BuildSlidesOptions = {}
) {
  if (!Array.isArray(data) || data.length === 0) return;

  const { subject, startNum = 1 } = options;

  // Detect materia from subject or first slide title
  const materiaKey = options.materia
    || detectMateria(subject || data.map(s => s.titulo).join(' '));
  const palette = options.palette || getPalette(materiaKey);
  const total = data.length;

  data.forEach((slideData, idx) => {
    const slideNum = startNum + idx;
    const tipo = slideData.tipo || 'concepto';
    const template = TIPO_TEMPLATES[tipo] || TIPO_TEMPLATES.concepto;

    const s = pptx.addSlide();
    s.background = { color: palette.bg };

    // Header
    drawHeader(pptx, s, palette, slideNum, total);

    // Decoration per tipo
    if (template.decorations === 'circles') drawCircles(pptx, s, palette);
    if (template.decorations === 'dots') drawDots(pptx, s, palette);
    if (template.decorations === 'wave') drawWave(pptx, s, palette);

    // ── P1.5-2: Bolivia mini badge (bottom-left, safe from page counter collision) ──
    const boliviaTopic = ((slideData.texto_pantalla || '') + ' ' + (slideData.titulo || '')).toLowerCase();
    if (/agua|water|ciclo|lluvia|evaporación|titicaca|bolivia|andes|altiplano/.test(boliviaTopic)) {
      // Compact pill badge in bottom-left (was at 8.3,0.15 — collided with slide counter)
      s.addShape(pptx.ShapeType.rect, {
        x: 0.4, y: 5.0, w: 1.5, h: 0.25,
        fill: { color: '0EA5E9' }, line: { type: 'none' },
      });
      s.addText('Bolivia', {
        x: 0.4, y: 5.0, w: 1.5, h: 0.25,
        fontSize: 9, fontFace: FONTS.bodyFallback, bold: true,
        color: 'FFFFFF', align: 'center', valign: 'middle',
      });
    }

    // Badge + Title
    const titlePos = template.titlePosition;
    if (titlePos === 'left' && template.badgeText) {
      drawBadge(pptx, s, palette, template.badgeText, template.badgeColor as any);
    }
    drawTitle(pptx, s, palette, slideData.titulo || 'Sin título', titlePos);

    // ── CONTENT AREA ──

    if (tipo === 'portada') {
      // ── Water/Bolivia background for portada ──
      const topicForBg = ((slideData.titulo || '') + ' ' + (slideData.prompt_imagen || '')).toLowerCase();
      const isWaterTopic = /agua|water|río|lago|lluvia|evaporación|ciclo (del )?agua|océano|mar|glaciar|titicaca|uyuni|altiplano|bolivia/.test(topicForBg);
      if (isWaterTopic) {
        s.background = { color: 'E0F2FE' }; // sky-50 light blue
        // ── P1-2: Full Bolivia water scene as background ──
        drawBoliviaWaterScene(pptx, s, 'lago-titicaca');
        // Subtle white overlay for readability
        s.addShape(pptx.ShapeType.rect, {
          x: 0, y: 3.0, w: SLIDE_W, h: 2.625,
          fill: { color: 'FFFFFF', transparency: 40 },
        });
        // Subtle water wave bar (keep existing for depth)
        s.addShape(pptx.ShapeType.rect, {
          x: 0, y: 4.5, w: SLIDE_W, h: 1.125,
          fill: { color: 'BAE6FD', transparency: 50 },
        });
        s.addShape(pptx.ShapeType.rect, {
          x: 0, y: 5.0, w: SLIDE_W, h: 0.625,
          fill: { color: '7DD3FC', transparency: 60 },
        });
      }

      // Portada: hero text + tagline + decorations
      const subtitle = slideData.texto_pantalla || slideData.callout || '';
      if (subtitle) {
        s.addText(subtitle, {
          x: 0.8, y: 3.5, w: SLIDE_W - 1.6, h: 1.2,
          fontSize: 18, fontFace: FONTS.bodyFallback,
          color: palette.textMuted, align: 'center', valign: 'middle',
          italic: true, lineSpacingMultiple: 1.3,
        });
      }
      // Decorative accent shape bottom
      s.addShape(pptx.ShapeType.rect, {
        x: 4.0, y: 4.8, w: 2, h: 0.08,
        fill: { color: palette.accent },
      });

    } else if (tipo === 'objetivos') {
      // Objetivos: numbered list with bloom verbs, organized grid
      const objetivosText = slideData.texto_pantalla || BLOOM_VERBS.slice(0, 3).map((v, i) => `${i + 1}. ${v}`).join('\n');
      const lines = objetivosText.split('\n').filter(l => l.trim());
      const listY = HEADER_H + 1.4;
      const rowH = Math.min(0.7, (SLIDE_H - listY - 0.7) / Math.max(lines.length, 1));

      lines.forEach((line, i) => {
        // Number circle
        s.addShape(pptx.ShapeType.ellipse, {
          x: MARGIN, y: listY + i * rowH + 0.05, w: 0.55, h: 0.55,
          fill: { color: palette.primary },
        });
        s.addText(String(i + 1), {
          x: MARGIN, y: listY + i * rowH + 0.05, w: 0.55, h: 0.55,
          fontSize: 18, fontFace: FONTS.titleFallback, bold: true,
          color: palette.textLight, align: 'center', valign: 'middle',
        });

        // Line text
        s.addText(line.replace(/^\d+\.\s*/, ''), {
          x: MARGIN + 0.75, y: listY + i * rowH, w: CONTENT_W - 0.85, h: 0.65,
          fontSize: 16, fontFace: FONTS.bodyFallback,
          color: palette.text, valign: 'middle',
        });
      });

    } else if (tipo === 'pausa') {
      // Pausa: energetic, large action card with numbered steps
      const steps = (slideData.texto_pantalla || '').split('\n').filter(l => l.trim());
      const stepY = HEADER_H + 1.4;
      const stepH = Math.min(0.6, (SLIDE_H - stepY - 0.7) / Math.max(steps.length, 1));

      steps.forEach((step, i) => {
        s.addShape(pptx.ShapeType.roundRect, {
          x: MARGIN + (i % 2) * 4.7, y: stepY + Math.floor(i / 2) * (stepH + 0.2), w: 4.5, h: stepH,
          fill: { color: palette.warm }, rectRadius: RADIUS,
          line: { color: palette.accent, width: 1.5 },
        });
        s.addShape(pptx.ShapeType.ellipse, {
          x: MARGIN + (i % 2) * 4.7 + 0.15, y: stepY + Math.floor(i / 2) * (stepH + 0.2) + 0.1, w: 0.4, h: 0.4,
          fill: { color: palette.accent },
        });
        s.addText(String(i + 1), {
          x: MARGIN + (i % 2) * 4.7 + 0.15, y: stepY + Math.floor(i / 2) * (stepH + 0.2) + 0.1, w: 0.4, h: 0.4,
          fontSize: 14, fontFace: FONTS.titleFallback, bold: true,
          color: palette.textLight, align: 'center', valign: 'middle',
        });
        s.addText(step.replace(/^\d+[\.\)]\s*/, ''), {
          x: MARGIN + (i % 2) * 4.7 + 0.65, y: stepY + Math.floor(i / 2) * (stepH + 0.2), w: 3.7, h: stepH,
          fontSize: 13, fontFace: FONTS.bodyFallback,
          color: palette.text, valign: 'middle',
        });
      });

    } else if (tipo === 'cierre') {
      // Cierre: summary grid with checkmarks inside card + success badge
      const items = (slideData.texto_pantalla || '').split('\n').filter(l => l.trim());
      const cardY = 1.5;
      const cardH = 2.6;
      // Card background
      s.addShape(pptx.ShapeType.roundRect, {
        x: MARGIN, y: cardY, w: CONTENT_W, h: cardH,
        fill: { color: palette.surface }, rectRadius: RADIUS,
        shadow: { type: 'outer', blur: 6, offset: 2, color: '#000000', opacity: 0.08 },
        line: { color: palette.primary, width: 0.5 },
      });

      const itemY = cardY + 0.3;
      const itemH = Math.min(0.55, (cardH - 1.0) / Math.max(items.length, 1));

      items.forEach((item, i) => {
        // Checkmark indicator: green circle (shape only, no glyph — ✓ renders as box in many fonts)
        s.addShape(pptx.ShapeType.ellipse, {
          x: MARGIN + 0.3, y: itemY + i * itemH + 0.05, w: 0.45, h: 0.45,
          fill: { color: palette.secondary },
        });

        s.addText(item.replace(/^[•\-]\s*/, ''), {
          x: MARGIN + 0.9, y: itemY + i * itemH, w: CONTENT_W - 1.2, h: 0.55,
          fontSize: 14, fontFace: FONTS.bodyFallback,
          color: palette.text, valign: 'middle',
        });
      });

      // Success badge — centered inside card
      s.addShape(pptx.ShapeType.roundRect, {
        x: 4.0, y: cardY + cardH - 0.52, w: 2, h: 0.45,
        fill: { color: palette.primary }, rectRadius: 0.08,
      });
      s.addText('¡Lo lograste!', {
        x: 4.0, y: cardY + cardH - 0.52, w: 2, h: 0.45,
        fontSize: 14, fontFace: FONTS.titleFallback, bold: true,
        color: palette.textLight, align: 'center', valign: 'middle',
      });

      // ── P1-1: Water cycle icon strip ──
      // Horizontal icon strip showing the 5 stages of the water cycle
      // Positioned between the card and footer, centered
      const wcStages = [
        { icon: '☀️', label: 'Evaporación' },
        { icon: '💧', label: 'Condensación' },
        { icon: '☁️', label: 'Precipitación' },
        { icon: '🌧️', label: 'Infiltración' },
        { icon: '🌱', label: 'Escorrentía' },
      ];
      const stripY = 4.55;
      const iconSize = 0.45;
      const spacing = 1.6;
      const totalWidth = wcStages.length * spacing;
      const startX = (SLIDE_W - totalWidth) / 2;
      wcStages.forEach((stage, i) => {
        s.addText(stage.icon, {
          x: startX + i * spacing, y: stripY,
          w: iconSize, h: iconSize,
          fontSize: 28, fontFace: 'Segoe UI Emoji', align: 'center', valign: 'middle',
        });
        s.addText(stage.label, {
          x: startX + i * spacing - 0.2, y: stripY + 0.5,
          w: spacing + 0.4, h: 0.25,
          fontSize: 9, fontFace: FONTS.bodyFallback, align: 'center',
          color: palette.textMuted,
        });
      });

    } else {
      // Concepto (default): clean card with text
      const contentY = HEADER_H + 1.3;
      if (slideData.texto_pantalla) {
        drawContentCard(pptx, s, palette, slideData.texto_pantalla, contentY, 3.0, template.cardShadow);
      }

      // ── P1-3: Water cycle diagram on concept slides ──
      const diagTopic = ((slideData.texto_pantalla || '') + ' ' + (slideData.titulo || '')).toLowerCase();
      if (WATER_CYCLE_KEYWORDS.test(diagTopic)) {
        buildWaterCycleDiagram(pptx, s, palette, slideData.titulo || '');
      }
    }

    // ── CALLOUT (highlighted example/insight) ──
    if (slideData.callout) {
      const calloutY = tipo === 'concepto' ? HEADER_H + 4.0 : 4.5;
      s.addShape(pptx.ShapeType.roundRect, {
        x: MARGIN, y: calloutY, w: CONTENT_W, h: 0.6,
        fill: { color: palette.warm }, rectRadius: 0.1,
        line: { color: palette.accent, width: 1.5 },
      });
      s.addText('★ ', {
        x: MARGIN + 0.15, y: calloutY, w: 0.3, h: 0.6,
        fontSize: 18, fontFace: FONTS.titleFallback, bold: true,
        color: palette.accent, valign: 'middle',
      });
      s.addText(slideData.callout, {
        x: MARGIN + 0.45, y: calloutY, w: CONTENT_W - 0.6, h: 0.6,
        fontSize: 13, fontFace: FONTS.bodyFallback, italic: true,
        color: palette.text, valign: 'middle',
      });
    }

    // ── TEACHER SCRIPT (if present) ──
    if (slideData.guion_docente) {
      const noteY = 4.6;
      s.addShape(pptx.ShapeType.roundRect, {
        x: MARGIN, y: noteY, w: CONTENT_W, h: 0.65,
        fill: { color: '#FFFBEB' }, rectRadius: 0.05,
        line: { color: '#FCD34D', width: 0.5 },
      });
      s.addText('Nota docente', {
        x: MARGIN + 0.15, y: noteY, w: 1.5, h: 0.25,
        fontSize: 8, fontFace: FONTS.bodyFallback, bold: true,
        color: '#B45309',
      });
      s.addText(slideData.guion_docente, {
        x: MARGIN + 0.15, y: noteY + 0.22, w: CONTENT_W - 0.3, h: 0.4,
        fontSize: 9, fontFace: FONTS.bodyFallback, italic: true,
        color: '#6B7280', valign: 'top',
      });
    }

    // Footer
    drawFooter(pptx, s, palette, subject);

    // Page number
    if (template.showPageNumber) {
      addPageNumber(s, slideNum);
    }
  });
}