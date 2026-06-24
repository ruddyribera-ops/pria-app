// PRIA v10 Design Tokens
// Professional educational slides with warm, approachable aesthetics

export const FONTS = {
  // Sans-serif family
  title: 'Inter',
  titleFallback: 'Arial',
  body: 'Inter',
  bodyFallback: 'Arial',
  // Serif family (for emphasis)
  emphasis: 'Georgia',
  emphasisFallback: 'Times New Roman',
  // Monospace (for code/labels)
  mono: 'JetBrains Mono',
  monoFallback: 'Courier New',
} as const;

export const FONT_SIZES = {
  coverTitle: 44,
  slideTitle: 28,
  subtitle: 20,
  body: 16,
  bodySmall: 14,
  caption: 12,
  badge: 10,
  pageNumber: 10,
} as const;

// Typography variant system for visual hierarchy
export type TypographyVariant = 'hero' | 'title' | 'subtitle' | 'body' | 'caption' | 'emphasis' | 'label';

export interface TypographyStyle {
  fontFace: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  charSpacing?: number;
}

export function getTypography(variant: TypographyVariant, color: string = '#1F2937'): TypographyStyle {
  const styles: Record<TypographyVariant, TypographyStyle> = {
    hero: { fontFace: FONTS.title, fontSize: 60, bold: true, italic: false, color, charSpacing: -1 },
    title: { fontFace: FONTS.title, fontSize: 28, bold: true, italic: false, color },
    subtitle: { fontFace: FONTS.title, fontSize: 20, bold: false, italic: false, color },
    body: { fontFace: FONTS.body, fontSize: 14, bold: false, italic: false, color: '#374151' },
    caption: { fontFace: FONTS.body, fontSize: 11, bold: false, italic: false, color: '#6B7280' },
    emphasis: { fontFace: FONTS.emphasis, fontSize: 16, bold: false, italic: true, color },
    label: { fontFace: FONTS.mono, fontSize: 11, bold: true, italic: false, color, charSpacing: 1 },
  };
  return styles[variant];
}

export function pickFontSize(variant: TypographyVariant, containerWidth: number = 8): number {
  const baseSizes: Record<TypographyVariant, number> = {
    hero: 60, title: 28, subtitle: 20, body: 14, caption: 11, emphasis: 16, label: 11
  };
  const base = baseSizes[variant];
  if (containerWidth < 4) return Math.round(base * 0.6);
  if (containerWidth < 6) return Math.round(base * 0.8);
  return base;
}

// Primary brand colors
export const COLORS = {
  // Brand
  primary: '#0F766E',       // Deep teal
  primaryHover: '#0D9488',   // Teal hover
  
  // Accents
  accent: '#FF6B6B',         // Vibrant coral
  accentAlt: '#FBBF24',      // Sunshine yellow
  
  // Neutrals (warm palette)
  bg: '#FAFAF7',             // Warm white
  surface: '#F5F5F0',       // Light warm gray
  border: '#E5E5E0',         // Subtle border
  
  // Text
  text: '#1F2937',           // Charcoal
  textMuted: '#6B7280',     // Medium gray
  textLight: '#FFFFFF',     // White
  
  // Semantic
  success: '#10B981',        // Emerald
  warning: '#F59E0B',        // Amber
  error: '#EF4444',          // Red
  info: '#3B82F6',           // Blue
  purple: '#7C3AED',         // Purple (for COLOR_VIOLET alias)
  
  // Legacy aliases for existing code
  COLOR_BG: '#FAFAF7',
  COLOR_ACCENT: '#FF6B6B',
  COLOR_WHITE: '#FFFFFF',
  COLOR_TEXT: '#1F2937',
  COLOR_SUBTLE: '#6B7280',
  COLOR_BLUE: '#3B82F6',
  COLOR_PURPLE: '#7C3AED',
  COLOR_ORANGE: '#F59E0B',
  COLOR_GREEN: '#10B981',
  COLOR_RED: '#EF4444',
  COLOR_VIOLET: '#7C3AED',
  COLOR_CYAN: '#0891B2',
  COLOR_PINK: '#DB2777',
  
  // Legacy green (main PRIA brand)
  COLOR_PRIA_GREEN: '#3A9E5E',

  // Mnemonic palette for color-coded memory aids (e.g. Agudas/Graves/Esdrújulas)
  mnemonicPalette: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'],
} as const;

// Re-export legacy constants for backward compatibility
export const FONT_TITLE = FONTS.title;
export const FONT_BODY = FONTS.body;
export const COLOR_PRIMARY = COLORS.primary;
export const COLOR_ACCENT = COLORS.accent;
export const COLOR_BG = COLORS.bg;
export const COLOR_WHITE = COLORS.textLight;
export const COLOR_TEXT = COLORS.text;
export const COLOR_SUBTLE = COLORS.textMuted;
export const COLOR_BLUE = COLORS.info;
export const COLOR_GREEN = COLORS.success;
export const COLOR_VIOLET = COLORS.purple;
export const COLOR_PURPLE = COLORS.purple;
export const COLOR_ORANGE = COLORS.warning;
export const COLOR_RED = COLORS.error;
export const COLOR_CYAN = '#0891B2';
export const COLOR_PINK = '#DB2777';

// Layout constants
export const SLIDE_W = 10;
export const SLIDE_H = 5.625;
export const MARGIN = 0.5;
export const HEADER_H = 0.5;
export const CONTENT_W = SLIDE_W - MARGIN * 2;
export const CONTENT_H = SLIDE_H - HEADER_H - MARGIN - 0.3;
export const RADIUS = 0.15;
export const PAGE_NUM_X = 9.3;
export const PAGE_NUM_Y = 5.1;
