/**
 * PRIA v10 PPTX Design System
 * 
 * Design tokens for professional educational slides:
 * - Deep teal primary (#0F766E) for headers and accents
 * - Vibrant coral (#FF6B6B) for highlights and activity callouts
 * - Warm white (#FAFAF7) backgrounds with generous whitespace
 * - Inter font family throughout for clean, modern typography
 * 
 * 16:9 format (10" × 5.625")
 * 0.5" margins, 0.5" header bar
 * Cards with 0.15" radius and subtle shadows
 */

import type { Palette } from './types';

// ===== Dimensions =====
export const SLIDE_W = 10;
export const SLIDE_H = 5.625;
export const MARGIN = 0.5;
export const HEADER_H = 0.5;
export const TOP_BAR_H = HEADER_H; // alias for backward compat with buildSlides.ts
export const CONTENT_W = SLIDE_W - MARGIN * 2; // 9"
export const CONTENT_H = SLIDE_H - HEADER_H - MARGIN - 0.5; // ~4.125"
export const RADIUS = 0.15;
export const PAGE_NUM_X = 9.3;
export const PAGE_NUM_Y = 5.1;
export const COVER_PANEL_W = 3.8;

// ===== Fonts =====
export const FONTS = {
  title: 'Inter',
  titleFallback: 'Arial',
  body: 'Inter',
  bodyFallback: 'Arial',
} as const;

export const FONT_SIZES = {
  coverTitle: 44,
  coverSubtitle: 20,
  slideTitle: 28,
  slideTitleSmall: 22,
  subtitle: 20,
  body: 16,
  bodySmall: 14,
  caption: 12,
  pageNumber: 10,
  badge: 10,
} as const;

// ===== Colors =====
export const COLORS = {
  // Primary brand
  primary: '#0F766E',       // Deep teal
  primaryHover: '#0D9488',  // Teal hover
  
  // Accents
  accent: '#FF6B6B',         // Vibrant coral
  accentAlt: '#FBBF24',      // Sunshine yellow
  
  // Neutrals
  bg: '#FAFAF7',             // Warm white
  surface: '#F5F5F0',       // Light warm gray
  border: '#E5E5E0',         // Subtle border
  
  // Text
  text: '#1F2937',           // Charcoal
  textMuted: '#6B7280',      // Medium gray
  textLight: '#FFFFFF',      // White
  
  // Semantic
  success: '#10B981',        // Emerald
  warning: '#F59E0B',        // Amber
  error: '#EF4444',          // Red
  info: '#3B82F6',           // Blue
} as const;

// Subject → Palette Mapping
const SUBJECT_PALETTES: Record<string, Palette> = {
  'Matemáticas': {
    name: 'Navy & Gold',
    primary: '#1E3A5F',
    secondary: '#FBBF24',
    accent: '#3B82F6',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
  'Lenguaje': {
    name: 'Teal & Coral',
    primary: '#0F766E',
    secondary: '#FF6B6B',
    accent: '#F5F5F0',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
  'Ciencias Naturales': {
    name: 'Forest Green',
    primary: '#166534',
    secondary: '#86EFAC',
    accent: '#22C55E',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
  'Ciencias Sociales': {
    name: 'Slate & Terracotta',
    primary: '#4A4A4A',
    secondary: '#FCD34D',
    accent: '#D97706',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
  'Historia': {
    name: 'Sepia Classic',
    primary: '#78350F',
    secondary: '#FDE68A',
    accent: '#B45309',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
  'Inglés': {
    name: 'Purple & Lavender',
    primary: '#5B21B6',
    secondary: '#DDD6FE',
    accent: '#A78BFA',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
  'Educación Física': {
    name: 'Coral & Teal',
    primary: '#C7695C',
    secondary: '#0F766E',
    accent: '#5EEAD4',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
  'Artes': {
    name: 'Terracotta & Sand',
    primary: '#B85C38',
    secondary: '#FEF3C7',
    accent: '#3B82F6',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
  'Música': {
    name: 'Deep Teal & Gold',
    primary: '#0F766E',
    secondary: '#FBBF24',
    accent: '#14B8A6',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
  'Religión': {
    name: 'Burgundy & Cream',
    primary: '#6B2C3E',
    secondary: '#FEF3C7',
    accent: '#BE185D',
    bg: '#FAFAF7',
    textDark: '#1F2937',
    textLight: '#FFFFFF',
  },
};

// Default palette fallback
const DEFAULT_PALETTE: Palette = {
  name: 'PRIA Default',
  primary: '#0F766E',
  secondary: '#F5F5F0',
  accent: '#FF6B6B',
  bg: '#FAFAF7',
  textDark: '#1F2937',
  textLight: '#FFFFFF',
};

/**
 * Get palette for a subject/topic
 * Uses exact match first, then partial match
 */
export function getPalette(subject: string): Palette {
  if (!subject) return DEFAULT_PALETTE;
  
  const exact = SUBJECT_PALETTES[subject];
  if (exact) return exact;

  const lower = subject.toLowerCase();
  for (const [key, pal] of Object.entries(SUBJECT_PALETTES)) {
    if (lower.includes(key.toLowerCase())) return pal;
  }

  return DEFAULT_PALETTE;
}

/**
 * Decorative circle positions for cover slide
 * Big overlapping circles (40-60% opacity) for dramatic visual interest
 * Sizes in inches — circles are 200-300px equivalent at 96dpi
 */
export function getCoverCircles(): { x: number; y: number; r: number }[] {
  return [
    { x: 0.2, y: 0.3, r: 1.2 },   // Big top-left
    { x: 1.5, y: 1.5, r: 0.9 },   // Medium center
    { x: 0.6, y: 3.5, r: 1.1 },   // Big bottom
    { x: 2.2, y: 4.2, r: 0.7 },   // Medium bottom-right
    { x: 0.1, y: 5.0, r: 0.5 },   // Small bottom-left
  ];
}

/**
 * Get a contrasting text color for a background
 */
export function getContrastColor(backgroundColor: string): 'light' | 'dark' {
  // Simple luminance check - can be enhanced
  const darkColors = ['#1F2937', '#0F766E', '#1E3A5F', '#166534', '#5B21B6'];
  const bg = backgroundColor.toUpperCase();
  return darkColors.includes(bg) ? 'light' : 'dark';
}
