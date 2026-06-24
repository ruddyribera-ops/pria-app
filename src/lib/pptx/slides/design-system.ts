// PRIA v10 Design System v2.0
// 5 distinct templates per slide tipo + per-materia palettes + clean branding

// ─── BRANDING ───────────────────────────────────────────────────────────────
export const BRAND = {
  name: 'PRIA',
  tagline: 'Educación con propósito',
  // Simple geometric mark: open book + light
  logoSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
    <path d="M5 18 L30 12 L55 18 L55 50 L30 44 L5 50 Z" fill="#0F766E" opacity="0.9"/>
    <path d="M30 12 L30 44" stroke="#FFFBEB" stroke-width="1.5"/>
    <circle cx="30" cy="8" r="3" fill="#FBBF24"/>
  </svg>`,
} as const;

// ─── PALETTES PER MATERIA ───────────────────────────────────────────────────
// Each palette is tuned for cultural relevance + visual harmony
export interface Palette {
  primary: string;       // Header / titles
  primaryDark: string;   // Hover / shadows
  secondary: string;     // Subheaders / accents
  accent: string;        // Highlights / callouts
  warm: string;          // Warm accent (callout bg)
  bg: string;            // Page background
  surface: string;       // Card background
  text: string;          // Body text
  textMuted: string;     // Captions / metadata
  textLight: string;     // Text on dark bg
  gradient: [string, string]; // Header gradient
}

export const PALETTES: Record<string, Palette> = {
  // Lenguaje — Green (PRIA original brand, literary)
  lenguaje: {
    primary: '#3A9E5E',       // PRIA green
    primaryDark: '#2D7A47',
    secondary: '#7CB342',     // Fresh green
    accent: '#F4A261',        // Warm orange (storytelling)
    warm: '#FEF3E2',          // Warm cream
    bg: '#FBFCF7',            // Off-white green
    surface: '#FFFFFF',
    text: '#1C2E1F',          // Deep forest
    textMuted: '#5A6B5D',
    textLight: '#FFFFFF',
    gradient: ['#3A9E5E', '#2D7A47'],
  },

  // Sociales — Warm earth (cultural, archaeological)
  sociales: {
    primary: '#5C4033',       // Dark brown (soils, history)
    primaryDark: '#3E2A20',
    secondary: '#C4956A',     // Tan (terracotta)
    accent: '#4A7C70',        // Teal (Andean textiles)
    warm: '#FBF5EE',          // Warm cream
    bg: '#FBF5EE',
    surface: '#FFFFFF',
    text: '#2C1E15',          // Deep brown
    textMuted: '#7A6B5E',
    textLight: '#FFFFFF',
    gradient: ['#5C4033', '#3E2A20'],
  },

  // Matemáticas — Cool blue (logic, structure)
  matematicas: {
    primary: '#1E40AF',       // Royal blue
    primaryDark: '#1E3A8A',
    secondary: '#3B82F6',     // Sky blue
    accent: '#F59E0B',        // Amber (geometry)
    warm: '#FEF3C7',          // Warm yellow bg
    bg: '#F0F4FF',            // Cool white
    surface: '#FFFFFF',
    text: '#0F1E47',          // Deep navy
    textMuted: '#4A5B7E',
    textLight: '#FFFFFF',
    gradient: ['#1E40AF', '#1E3A8A'],
  },

  // Ciencias Naturales — Fresh green/blue (nature, biology)
  ciencias_naturales: {
    primary: '#0D9488',       // Teal
    primaryDark: '#0F766E',
    secondary: '#65A30D',     // Lime
    accent: '#F59E0B',        // Sun
    warm: '#ECFCCB',          // Light green
    bg: '#F0FDFA',            // Mint white
    surface: '#FFFFFF',
    text: '#134E4A',          // Deep teal
    textMuted: '#5C7E7C',
    textLight: '#FFFFFF',
    gradient: ['#0D9488', '#0F766E'],
  },

  // Religión / Valores — Soft purple (spiritual, ethical)
  valores: {
    primary: '#6D28D9',       // Deep purple
    primaryDark: '#5B21B6',
    secondary: '#A78BFA',     // Lavender
    accent: '#F59E0B',        // Gold (divine light)
    warm: '#F5F3FF',          // Lavender bg
    bg: '#FAF5FF',
    surface: '#FFFFFF',
    text: '#2E1065',
    textMuted: '#6B5B95',
    textLight: '#FFFFFF',
    gradient: ['#6D28D9', '#5B21B6'],
  },

  // Educación Física / Deportes — Energetic orange/red
  educacion_fisica: {
    primary: '#DC2626',       // Energetic red
    primaryDark: '#991B1B',
    secondary: '#F59E0B',     // Sport orange
    accent: '#3B82F6',        // Sky blue
    warm: '#FEF2F2',          // Soft red bg
    bg: '#FFFBEB',
    surface: '#FFFFFF',
    text: '#450A0A',
    textMuted: '#7A4A4A',
    textLight: '#FFFFFF',
    gradient: ['#DC2626', '#991B1B'],
  },

  // Default fallback
  default: {
    primary: '#0F766E',
    primaryDark: '#0D9488',
    secondary: '#14B8A6',
    accent: '#F59E0B',
    warm: '#FEF3C7',
    bg: '#FAFAF7',
    surface: '#FFFFFF',
    text: '#1F2937',
    textMuted: '#6B7280',
    textLight: '#FFFFFF',
    gradient: ['#0F766E', '#0D9488'],
  }
} as const;

/**
 * Detect materia from tema/titulo keywords
 */
export function detectMateria(text: string): keyof typeof PALETTES {
  const lower = text.toLowerCase();
  if (/lenguaje|literatura|cuento|poes|verso|lectura|escritura|gramática|ortografía|verb|adjeti|sustantiv|texto|narrativa/.test(lower)) return 'lenguaje';
  if (/social|historia|geograf|poblamiento|am[eé]rica|bolivia|cultura|pueblo|indígena|comunid/.test(lower)) return 'sociales';
  if (/matem|fracci|n[uú]mero|geometr|c[aá]lcul|suma|resta|multiplic|divisi|ecuaci|operaci|problema|figura|cuerpo/.test(lower)) return 'matematicas';
  if (/ciencia|natural|animal|planta|ecosistema|bio|f[uú]sica|qu[ií]mica|cuerpo|humano|experimento/.test(lower)) return 'ciencias_naturales';
  if (/religi|valor|esp[íi]ritu|respeto|conviven|empat|paz|amor|honest/.test(lower)) return 'valores';
  if (/deport|f[íi]sica|movim|cuerpo|ejercicio|salud|atlet/.test(lower)) return 'educacion_fisica';
  return 'default';
}

export function getPalette(materia: keyof typeof PALETTES): Palette {
  return PALETTES[materia] || PALETTES.default;
}

// ─── ICONS PER TIPO ─────────────────────────────────────────────────────────
export const TIPO_ICONS: Record<string, string> = {
  portada: '✨',
  objetivos: '🎯',
  concepto: '💡',
  pausa: '🎬',
  cierre: '🎉',
};

// ─── TEMPLATE CONFIG ────────────────────────────────────────────────────────
export interface TipoTemplate {
  badgeText: string;
  badgeColor: string;
  titlePosition: 'center' | 'left';
  decorations: 'circles' | 'lines' | 'dots' | 'wave' | 'none';
  cardShadow: boolean;
  showPageNumber: boolean;
}

export const TIPO_TEMPLATES: Record<string, TipoTemplate> = {
  portada: {
    badgeText: 'INTRODUCCIÓN',
    badgeColor: 'accent',
    titlePosition: 'center',
    decorations: 'circles',
    cardShadow: false,
    showPageNumber: false,
  },
  objetivos: {
    badgeText: '🎯 OBJETIVOS',
    badgeColor: 'primary',
    titlePosition: 'left',
    decorations: 'none',
    cardShadow: true,
    showPageNumber: true,
  },
  concepto: {
    badgeText: '💡 CONCEPTO',
    badgeColor: 'secondary',
    titlePosition: 'left',
    decorations: 'none',
    cardShadow: true,
    showPageNumber: true,
  },
  pausa: {
    badgeText: '🎬 PAUSA ACTIVA',
    badgeColor: 'accent',
    titlePosition: 'left',
    decorations: 'dots',
    cardShadow: true,
    showPageNumber: true,
  },
  cierre: {
    badgeText: '🎉 LO QUE APRENDIMOS',
    badgeColor: 'warm',
    titlePosition: 'left',
    decorations: 'wave',
    cardShadow: true,
    showPageNumber: true,
  },
};
