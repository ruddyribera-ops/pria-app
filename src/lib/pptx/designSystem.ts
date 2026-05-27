/**
 * PRIA PPTX Design System
 * Based on the handover educational design spec.
 *
 * - 16:9 format (10" × 5.625")
 * - Bitter titles (54pt cover, 28pt content)
 * - Calibri body (13-15pt)
 * - Top bar: secondary color, 0.08" high
 * - Page numbers: circle at x:9.3 y:5.1 (except cover)
 * - Cards: roundedRect with shadow
 * - Cover: left panel 3.8" primary + decorative circles
 */

import type { Palette } from './types';

// ===== Dimensions =====
export const SLIDE_W = 10;
export const SLIDE_H = 5.625;
export const MARGIN = 0.4;
export const CONTENT_W = SLIDE_W - MARGIN * 2; // 9.2"
export const TOP_BAR_H = 0.08;
export const PAGE_NUM_X = 9.3;
export const PAGE_NUM_Y = 5.1;
export const COVER_PANEL_W = 3.8;

// ===== Fonts =====
export const FONTS = {
  title: 'Bitter',
  titleFallback: 'Georgia',
  body: 'Calibri',
} as const;

export const FONT_SIZES = {
  coverTitle: 54,
  coverSubtitle: 18,
  slideTitle: 28,
  slideTitleSmall: 22,
  body: 13,
  bodySmall: 11,
  pageNumber: 9,
  badge: 10,
} as const;

// ===== Subject → Palette Mapping =====
const SUBJECT_PALETTES: Record<string, Palette> = {
  Matemáticas: {
    name: 'Navy & Gold',
    primary: '#2D3A54',
    secondary: '#C99B3B',
    accent: '#5A7D9A',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
  Lenguaje: {
    name: 'Teal',
    primary: '#1A6B73',
    secondary: '#E8A87C',
    accent: '#3A9BAE',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
  'Ciencias Naturales': {
    name: 'Forest',
    primary: '#4A6B4A',
    secondary: '#C4A86A',
    accent: '#6B8E6B',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
  'Ciencias Sociales': {
    name: 'Stone & Terracotta',
    primary: '#4A5054',
    secondary: '#C97B5A',
    accent: '#7A8A8E',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
  Historia: {
    name: 'Slate & Sand',
    primary: '#3D5A70',
    secondary: '#D4A574',
    accent: '#6B8A9E',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
  Inglés: {
    name: 'Purple & Amber',
    primary: '#4A2C5C',
    secondary: '#D4A24E',
    accent: '#7A5C8E',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
  'Educación Física': {
    name: 'Coral',
    primary: '#C7695C',
    secondary: '#E8B88A',
    accent: '#5A8C8E',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
  Artes: {
    name: 'Terracotta',
    primary: '#B85C38',
    secondary: '#E2A76F',
    accent: '#3D6B9E',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
  Música: {
    name: 'Deep Teal',
    primary: '#1A5C6B',
    secondary: '#D4A07A',
    accent: '#3A8A9E',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
  Religión: {
    name: 'Burgundy',
    primary: '#6B2C3E',
    secondary: '#C99B6A',
    accent: '#8A5C6E',
    bg: '#FFFFFF',
    textDark: '#1e1e2f',
    textLight: '#FFFFFF',
  },
};

/** Default palette if subject is not found */
const DEFAULT_PALETTE: Palette = {
  name: 'Default',
  primary: '#3A9E5E',
  secondary: '#5C6AC4',
  accent: '#3A9BAE',
  bg: '#FFFFFF',
  textDark: '#1e1e2f',
  textLight: '#FFFFFF',
};

/** Get palette for a subject/topic */
export function getPalette(subject: string): Palette {
  // Try exact match first
  const exact = SUBJECT_PALETTES[subject];
  if (exact) return exact;

  // Try partial match
  const lower = subject.toLowerCase();
  for (const [key, pal] of Object.entries(SUBJECT_PALETTES)) {
    if (lower.includes(key.toLowerCase())) return pal;
  }

  return DEFAULT_PALETTE;
}

/** Get an array of decorative circle positions for the cover */
export function getCoverCircles(): { x: number; y: number; r: number }[] {
  return [
    { x: 0.6, y: 0.6, r: 0.35 },
    { x: 2.0, y: 1.2, r: 0.25 },
    { x: 1.2, y: 4.0, r: 0.3 },
    { x: 2.8, y: 4.5, r: 0.2 },
    { x: 0.3, y: 2.5, r: 0.15 },
  ];
}
