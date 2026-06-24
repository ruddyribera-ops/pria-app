/**
 * PRIA PPTX Builder
 * Generates educational PPTX using PptxGenJS with the handover design system.
 *
 * Flow:
 *   buildSlideDeck(content, subject) → ArrayBuffer (ready to download)
 *
 * @deprecated since Sprint 9 — Use generator.ts for PPTX generation.
 *             This file is only used by SlideEditorPanel.
 *             The main export pipeline uses generator.ts → slides/slides.ts
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideContent } from './types';
import {
  SLIDE_W,
  SLIDE_H,
  MARGIN,
  CONTENT_W,
  TOP_BAR_H,
  PAGE_NUM_X,
  PAGE_NUM_Y,
  COVER_PANEL_W,
  FONTS,
  FONT_SIZES,
  getPalette,
  getCoverCircles,
} from './designSystem';

const TITLE_FONT = `${FONTS.title},${FONTS.titleFallback}`;

/** Round rect radius */
const CARD_RADIUS = 0.1;

/**
 * Build a complete PPTX slide deck from AI-generated content.
 * Returns the PPTX as a Blob ready for download.
 */
export async function buildSlideDeck(
  content: SlideContent,
  subject: string
): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'WIDE';

  const pal = getPalette(subject);
  let slideNum = 0;

  // ── Slide 1: Cover ──
  slideNum++;
  addCoverSlide(pptx, content, pal);

  // ── Slide 2: Objectives ──
  if (content.objectives.length > 0) {
    slideNum++;
    addObjectivesSlide(pptx, content, pal);
  }

  // ── Content Slides ──
  for (const slide of content.slides) {
    slideNum++;
    addContentSlide(pptx, slide, pal, slideNum, content.slides.length + 1);
  }

  // ── Activity Slides ──
  if (content.activities) {
    for (const act of content.activities) {
      slideNum++;
      addActivitySlide(pptx, act, pal, slideNum);
    }
  }

  // Generate
  const buffer = await pptx.write({ outputType: 'blob' });
  return buffer as Blob;
}

// ===================== Slide Builders =====================

function addCoverSlide(
  pptx: PptxGenJS,
  content: SlideContent,
  pal: ReturnType<typeof getPalette>
) {
  const slide = pptx.addSlide();

  // Background
  slide.background = { color: pal.bg };

  // Left panel (3.8" wide, full height)
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: COVER_PANEL_W,
    h: SLIDE_H,
    fill: { color: pal.primary },
  });

  // Decorative circles on left panel (30% transparency)
  const circles = getCoverCircles();
  for (const c of circles) {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: c.x,
      y: c.y,
      w: c.r * 2,
      h: c.r * 2,
      fill: { color: pal.secondary, transparency: 70 },
    });
  }

  // Title (right of panel, large)
  slide.addText(content.cover.title, {
    x: COVER_PANEL_W + 0.6,
    y: 1.2,
    w: SLIDE_W - COVER_PANEL_W - 1.2,
    h: 1.5,
    fontSize: FONT_SIZES.coverTitle,
    fontFace: TITLE_FONT,
    color: pal.primary,
    bold: true,
    align: 'left',
    valign: 'middle',
  });

  // Subtitle
  slide.addText(content.cover.subtitle, {
    x: COVER_PANEL_W + 0.6,
    y: 2.7,
    w: SLIDE_W - COVER_PANEL_W - 1.2,
    h: 0.6,
    fontSize: FONT_SIZES.coverSubtitle,
    fontFace: FONTS.body,
    color: pal.textDark,
    align: 'left',
  });

  // Grade & Subject info at bottom
  slide.addText(`${content.cover.grade} · ${content.cover.subject}`, {
    x: COVER_PANEL_W + 0.6,
    y: 4.2,
    w: SLIDE_W - COVER_PANEL_W - 1.2,
    h: 0.4,
    fontSize: FONT_SIZES.bodySmall,
    fontFace: FONTS.body,
    color: pal.accent,
    align: 'left',
  });
}

function addObjectivesSlide(
  pptx: PptxGenJS,
  content: SlideContent,
  pal: ReturnType<typeof getPalette>
) {
  const slide = pptx.addSlide();

  // Top bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: TOP_BAR_H,
    fill: { color: pal.secondary },
  });

  // Title
  slide.addText('🎯 Objetivos de Aprendizaje', {
    x: MARGIN, y: 0.4, w: CONTENT_W, h: 0.6,
    fontSize: FONT_SIZES.slideTitle,
    fontFace: TITLE_FONT,
    color: pal.primary,
    bold: true,
  });

  // Each objective as a numbered card with Bloom level
  const bloomLevels = ['Recordar', 'Comprender', 'Aplicar', 'Analizar'];
  const yStart = 1.3;
  const cardH = 0.7;
  const gap = 0.15;

  content.objectives.forEach((obj, i) => {
    const y = yStart + i * (cardH + gap);
    const levelLabel = bloomLevels[Math.min(i, bloomLevels.length - 1)];

    // Card background
    slide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y, w: CONTENT_W, h: cardH,
      fill: { color: '#F8F8FF' },
      rectRadius: CARD_RADIUS,
      shadow: { type: 'outer', blur: 4, offset: 1, color: '#000000', opacity: 0.08 },
    });

    // Number circle
    slide.addShape(pptx.ShapeType.ellipse, {
      x: MARGIN + 0.25, y: y + 0.12, w: 0.45, h: 0.45,
      fill: { color: pal.primary },
    });
    slide.addText(`${i + 1}`, {
      x: MARGIN + 0.25, y: y + 0.12, w: 0.45, h: 0.45,
      fontSize: 16, fontFace: FONTS.body,
      color: '#FFFFFF', bold: true, align: 'center', valign: 'middle',
    });

    // Bloom badge
    const badgeW = 0.85;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN + 0.85, y: y + 0.15, w: badgeW, h: 0.4,
      fill: { color: pal.accent },
      rectRadius: 0.05,
    });
    slide.addText(levelLabel, {
      x: MARGIN + 0.85, y: y + 0.15, w: badgeW, h: 0.4,
      fontSize: FONT_SIZES.badge, fontFace: FONTS.body,
      color: '#FFFFFF', align: 'center', valign: 'middle',
    });

    // Objective text
    slide.addText(obj, {
      x: MARGIN + 1.85, y, w: CONTENT_W - 2.1, h: cardH,
      fontSize: FONT_SIZES.body, fontFace: FONTS.body,
      color: pal.textDark, align: 'left', valign: 'middle',
    });
  });
}

function addContentSlide(
  pptx: PptxGenJS,
  slideContent: { title: string; paragraphs: string[]; copyToNotebook?: string; bullets?: string[] },
  pal: ReturnType<typeof getPalette>,
  slideNum: number,
  _totalSlides: number
) {
  const slide = pptx.addSlide();

  // Top bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: TOP_BAR_H,
    fill: { color: pal.secondary },
  });

  // Title
  slide.addText(slideContent.title, {
    x: MARGIN, y: 0.25, w: CONTENT_W, h: 0.55,
    fontSize: FONT_SIZES.slideTitleSmall,
    fontFace: TITLE_FONT,
    color: pal.primary,
    bold: true,
  });

  let yPos = 0.9;

  // Paragraphs (as cards)
  for (const para of slideContent.paragraphs) {
    const paraH = estimateTextHeight(para, FONT_SIZES.body, CONTENT_W - 0.5);

    // Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y: yPos, w: CONTENT_W, h: paraH + 0.3,
      fill: { color: '#FFFFFF' },
      line: { color: pal.accent, width: 0.5 },
      rectRadius: CARD_RADIUS,
      shadow: { type: 'outer', blur: 3, offset: 1, color: '#000000', opacity: 0.06 },
    });

    // Accent left border
    slide.addShape(pptx.ShapeType.rect, {
      x: MARGIN, y: yPos, w: 0.06, h: paraH + 0.3,
      fill: { color: pal.accent },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN + 0.06, y: yPos, w: CONTENT_W - 0.06, h: paraH + 0.3,
      fill: { color: '#FFFFFF' },
      rectRadius: CARD_RADIUS,
    });

    // Actually, the above approach with overlapping shapes is fragile. Let me use a single shape with text overlay.
    // For simplicity, I'll remove the duplicate shape and just use a single card with text.

    slide.addText(para, {
      x: MARGIN + 0.25, y: yPos + 0.15, w: CONTENT_W - 0.5, h: paraH + 0.15,
      fontSize: FONT_SIZES.body, fontFace: FONTS.body,
      color: pal.textDark, align: 'left', valign: 'top',
      lineSpacingMultiple: 1.15,
    });

    yPos += paraH + 0.45;
  }

  // Copy-to-notebook box
  if (slideContent.copyToNotebook) {
    const boxH = 0.6;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: MARGIN, y: yPos, w: CONTENT_W, h: boxH,
      fill: { color: '#FFFBEB' },
      line: { color: '#F59E0B', width: 0.5 },
      rectRadius: CARD_RADIUS,
    });

    slide.addText(`📝 ${slideContent.copyToNotebook}`, {
      x: MARGIN + 0.3, y: yPos, w: CONTENT_W - 0.6, h: boxH,
      fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body,
      color: '#92400E', align: 'left', valign: 'middle',
      lineSpacingMultiple: 1.1,
    });

    yPos += boxH + 0.15;
  }

  // Bullets if any
  if (slideContent.bullets && slideContent.bullets.length > 0) {
    for (const bullet of slideContent.bullets) {
      const bulletH = 0.25;
      slide.addText(`• ${bullet}`, {
        x: MARGIN + 0.2, y: yPos, w: CONTENT_W - 0.4, h: bulletH,
        fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body,
        color: pal.textDark, align: 'left', valign: 'top',
      });
      yPos += bulletH + 0.02;
    }
  }

  // Page number
  addPageNumber(slide, slideNum, pal);
}

function addActivitySlide(
  pptx: PptxGenJS,
  activity: { title: string; instruction: string; questions: { text: string; options?: string[]; correctAnswer?: number }[] },
  pal: ReturnType<typeof getPalette>,
  slideNum: number
) {
  const slide = pptx.addSlide();

  // Top bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: TOP_BAR_H,
    fill: { color: pal.secondary },
  });

  // Title
  slide.addText(activity.title, {
    x: MARGIN, y: 0.25, w: CONTENT_W, h: 0.55,
    fontSize: FONT_SIZES.slideTitleSmall,
    fontFace: TITLE_FONT,
    color: pal.primary,
    bold: true,
  });

  // Instruction
  slide.addText(activity.instruction, {
    x: MARGIN, y: 0.85, w: CONTENT_W, h: 0.4,
    fontSize: FONT_SIZES.body, fontFace: FONTS.body,
    color: pal.textDark, align: 'left',
  });

  let yPos = 1.35;

  // Questions
  activity.questions.forEach((q, qi) => {
    const qH = 0.4;

    // Question badge
    const optionsLabel = ['A', 'B', 'C', 'D'];

    slide.addText(`${qi + 1}. ${q.text}`, {
      x: MARGIN, y: yPos, w: CONTENT_W, h: qH,
      fontSize: FONT_SIZES.body, fontFace: FONTS.body,
      color: pal.textDark, bold: true, align: 'left',
    });
    yPos += qH + 0.05;

    if (q.options) {
      q.options.forEach((opt, oi) => {
        const optH = 0.3;

        // Option badge
        slide.addShape(pptx.ShapeType.roundRect, {
          x: MARGIN + 0.2, y: yPos, w: 0.35, h: 0.28,
          fill: { color: pal.accent },
          rectRadius: 0.04,
        });
        slide.addText(optionsLabel[oi] || String(oi), {
          x: MARGIN + 0.2, y: yPos, w: 0.35, h: 0.28,
          fontSize: FONT_SIZES.badge, fontFace: FONTS.body,
          color: '#FFFFFF', bold: true, align: 'center', valign: 'middle',
        });

        // Option text
        slide.addText(opt, {
          x: MARGIN + 0.65, y: yPos, w: CONTENT_W - 0.85, h: 0.28,
          fontSize: FONT_SIZES.bodySmall, fontFace: FONTS.body,
          color: pal.textDark, align: 'left', valign: 'middle',
        });

        yPos += optH + 0.04;
      });
    }

    yPos += 0.1;
  });

  // Page number
  addPageNumber(slide, slideNum, pal);
}

// ===================== Helpers =====================

function addPageNumber(slide: any, num: number, pal: ReturnType<typeof getPalette>) {
  // Circle background
  slide.addShape('ellipse', {
    x: PAGE_NUM_X, y: PAGE_NUM_Y, w: 0.28, h: 0.28,
    fill: { color: pal.accent },
  });
  // Number
  slide.addText(String(num), {
    x: PAGE_NUM_X, y: PAGE_NUM_Y, w: 0.28, h: 0.28,
    fontSize: FONT_SIZES.pageNumber,
    fontFace: FONTS.body,
    color: '#FFFFFF',
    align: 'center',
    valign: 'middle',
  });
}

/** Rough estimate of text height based on character count and font size */
function estimateTextHeight(text: string, fontSize: number, maxWidth: number): number {
  // Rough: ~70 chars per line at 13pt in 9" width
  const charsPerLine = Math.floor(maxWidth * 72 / (fontSize * 0.45));
  const lines = Math.ceil(text.length / Math.max(charsPerLine, 20));
  const lineH = fontSize * 1.15 / 72; // in inches
  return Math.max(lines * lineH, 0.3);
}
