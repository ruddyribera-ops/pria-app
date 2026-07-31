// PRIA v10 — Bolivia Scenes
// P1-2: Reusable SVG/shape-based Bolivia water scene components
// Uses ONLY standard pptxgenjs shapes (no external images, no new dependencies)

import PptxGenJS from 'pptxgenjs';
import { FONTS } from './types';

export type BoliviaSceneType = 'lago-titicaca' | 'glaciar' | 'salar' | 'rio' | 'amazonia';

/**
 * Draw a stylized Bolivia water scene on a slide using native pptxgenjs shapes.
 *
 * Layout (2.5" tall strip at the top):
 * ┌──────────────────────────────────────────┐
 * │ Sky gradient (light→deep blue)    y=0-1.0│
 * │ Mountain silhouettes (Illimani)  y=1.0-2.0│
 * │ Snow caps                         y=1.0-1.3│
 * │ Water (lake/river)                y=2.0-3.5│
 * │ Wave lines                        y=2.5-3.0│
 * │ Caption                           y=3.2    │
 * └──────────────────────────────────────────┘
 */
export function drawBoliviaWaterScene(
  pptx: PptxGenJS,
  slide: any,
  scene: BoliviaSceneType = 'lago-titicaca'
): void {
  const SKY_H = 1.0;
  const MTN_TOP = 0.8;
  const MTN_H = 1.5;
  const WATER_TOP = 2.0;
  const WATER_H = 1.8;

  // ── Sky ──
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: SKY_H,
    fill: { color: 'BAE6FD' },
  });
  // Deep sky band
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: SKY_H - 0.3, w: 10, h: 0.3,
    fill: { color: '7DD3FC' },
  });

  // ── Mountain silhouettes (Illimani / Huayna Potosí) ──
  // Left peak
  slide.addShape(pptx.ShapeType.triangle, {
    x: 1.0, y: MTN_TOP + 0.5, w: 3.0, h: MTN_H,
    fill: { color: '64748B' },
  });
  // Center peak (tallest — Illimani)
  slide.addShape(pptx.ShapeType.triangle, {
    x: 2.5, y: MTN_TOP, w: 4.0, h: MTN_H + 0.3,
    fill: { color: '475569' },
  });
  // Right peak
  slide.addShape(pptx.ShapeType.triangle, {
    x: 5.5, y: MTN_TOP + 0.7, w: 3.0, h: MTN_H - 0.2,
    fill: { color: '64748B' },
  });
  // Far-right small peak
  slide.addShape(pptx.ShapeType.triangle, {
    x: 7.5, y: MTN_TOP + 1.0, w: 2.0, h: MTN_H - 0.5,
    fill: { color: '94A3B8' },
  });

  // ── Snow caps ──
  slide.addShape(pptx.ShapeType.triangle, {
    x: 4.0, y: MTN_TOP + 0.5, w: 1.0, h: 0.5,
    fill: { color: 'FFFFFF' },
  });
  slide.addShape(pptx.ShapeType.triangle, {
    x: 5.0, y: MTN_TOP + 0.7, w: 0.6, h: 0.35,
    fill: { color: 'F1F5F9' },
  });

  // ── Water body (Lago Titicaca blue) ──
  const waterColor =
    scene === 'amazonia' ? '0EA5E9' :
    scene === 'glaciar' ? '7DD3FC' :
    scene === 'salar' ? 'E0F2FE' :
    '0EA5E9'; // lago-titicaca, rio

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: WATER_TOP, w: 10, h: WATER_H,
    fill: { color: waterColor },
  });

  // ── Wave lines ──
  const waveColors = scene === 'salar' ? ['FFFFFF', 'F0F9FF'] : ['FFFFFF', 'BAE6FD'];
  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: WATER_TOP + 0.4, w: 9.0, h: 0,
    line: { color: waveColors[0], width: 0.8, dashType: 'dash' },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 1.0, y: WATER_TOP + 0.9, w: 8.0, h: 0,
    line: { color: waveColors[1], width: 0.8, dashType: 'dash' },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: WATER_TOP + 1.4, w: 9.0, h: 0,
    line: { color: waveColors[0], width: 0.6, dashType: 'dash' },
  });

  // ── Scene-specific elements ──
  if (scene === 'lago-titicaca') {
    // Reed boats (totora) — small rectangles
    for (let i = 0; i < 3; i++) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 1.5 + i * 2.5, y: WATER_TOP + 0.5, w: 0.4, h: 0.12,
        fill: { color: 'D97706' },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 1.5 + i * 2.5 + 0.05, y: WATER_TOP + 0.35, w: 0.02, h: 0.15,
        fill: { color: '92400E' },
      });
    }
  } else if (scene === 'amazonia') {
    // River meander — angled rectangles
    slide.addShape(pptx.ShapeType.rect, {
      x: 3.0, y: WATER_TOP + 0.3, w: 4.0, h: 0.1,
      fill: { color: '38BDF8' },
    });
  } else if (scene === 'salar') {
    // Salt flat reflection — lighter patches
    slide.addShape(pptx.ShapeType.rect, {
      x: 2.0, y: WATER_TOP + 0.2, w: 6.0, h: 0.6,
      fill: { color: 'F0F9FF', transparency: 30 },
    });
  }

  // ── Optional caption ──
  const captions: Record<BoliviaSceneType, string> = {
    'lago-titicaca': 'Lago Titicaca · Andes Bolivianos',
    'glaciar': 'Glaciares Andinos · Fuente de agua dulce',
    'salar': 'Salar de Uyuni · El desierto de sal',
    'rio': 'Ríos Bolivianos · Cuenca Amazónica',
    'amazonia': 'Amazonía Boliviana · Selva y ríos',
  };

  slide.addText(captions[scene], {
    x: 1.0, y: WATER_TOP + WATER_H - 0.35, w: 8.0, h: 0.3,
    fontSize: 9, fontFace: FONTS.bodyFallback, italic: true,
    color: 'FFFFFF', align: 'center', transparency: 20,
  });
}

/**
 * Draw a compact Bolivia water scene badge in the upper-right of a slide.
 * Smaller than full drawBoliviaWaterScene — just a mini landscape.
 */
export function drawBoliviaMiniBadge(
  pptx: PptxGenJS,
  slide: any,
  x: number = 7.0,
  y: number = 0.1
): void {
  const w = 2.8;
  const h = 1.2;

  // Sky
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h: h * 0.4,
    fill: { color: 'BAE6FD' },
  });
  // Mini mountain
  slide.addShape(pptx.ShapeType.triangle, {
    x: x + 0.5, y: y + 0.15, w: 1.2, h: 0.6,
    fill: { color: '64748B' },
  });
  // Snow cap
  slide.addShape(pptx.ShapeType.triangle, {
    x: x + 1.0, y: y + 0.2, w: 0.3, h: 0.2,
    fill: { color: 'FFFFFF' },
  });
  // Water
  slide.addShape(pptx.ShapeType.rect, {
    x, y: y + h * 0.5, w, h: h * 0.5,
    fill: { color: '0EA5E9' },
  });
  // "Bolivia" label
  slide.addText('🇧🇴 Bolivia', {
    x, y: y + h * 0.5, w, h: h * 0.5,
    fontSize: 9, fontFace: FONTS.bodyFallback, bold: true,
    color: 'FFFFFF', align: 'center', valign: 'middle',
  });
}
