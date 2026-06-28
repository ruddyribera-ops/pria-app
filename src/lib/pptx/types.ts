/** Slide content types for PPTX generation */

export interface SlideContent {
  /** Cover slide */
  cover: {
    title: string;
    subtitle: string;
    grade: string;
    subject: string;
  };
  /** Learning objectives (Bloom taxonomy) */
  objectives: string[];
  /** Content slides */
  slides: ContentSlide[];
  /** Activity slides */
  activities?: ActivitySlide[];
  /** Extra: textbook pages reference */
  textbookPages?: string;
  /** Extra: teacher name */
  teacher?: string;
  // ── Flat properties used by mergePhaseResults ──
  title?: string;
  subject?: string;
  grade?: string;
  bloomObjectives?: string[];
  concepts?: Array<{ title: string; description: string; icon: string }>;
  copyBoxes?: string[];
  paginas?: string;
}

export interface ContentSlide {
  title: string;
  /** Main body content as paragraphs */
  paragraphs: string[];
  /** Optional "copy to notebook" text */
  copyToNotebook?: string;
  /** Optional bullet list */
  bullets?: string[];
}

export interface ActivitySlide {
  title: string;
  instruction: string;
  /** Questions or options */
  questions: ActivityQuestion[];
}

export interface ActivityQuestion {
  text: string;
  options?: string[];
  correctAnswer?: number;
}

/** Visual palette for a slide deck — re-exported from the full design-system definition */
export type { Palette } from './slides/design-system';
