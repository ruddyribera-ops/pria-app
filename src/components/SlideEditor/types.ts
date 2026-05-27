/**
 * Slide Editor types — for live preview + inline editing of slides
 * after multi-phase generation completes.
 */

import type { Palette } from '../../lib/pptx/types';

/** One visual slide in the editor carousel */
export interface EditorSlide {
  id: string;
  type: 'cover' | 'objectives' | 'content' | 'activity' | 'copy';
  /** Display title (shown above slide in editor) */
  label: string;
  /** The slide number (1-based) */
  number: number;
  /** All editable elements on this slide */
  elements: EditorElement[];
}

/** A single editable element on a slide */
export interface EditorElement {
  id: string;
  type: 'title' | 'text' | 'image' | 'badge' | 'bullet' | 'copyBox';
  content: string;
  /** Optional badge label (for Bloom levels) */
  badgeLabel?: string;
  /** Optional image data (base64 or URL) */
  imageData?: string;
  /** Whether this element is an ordered list item */
  orderIndex?: number;
}

/** Complete editor state for a slide deck */
export interface SlideEditorState {
  slides: EditorSlide[];
  currentIndex: number;
  /** Subject-specific palette */
  palette: Palette;
}

/** Edits map: elementId → modified content */
export interface EditsMap {
  [elementId: string]: string;
}

/** Image map: elementId → base64 data URL */
export interface ImageMap {
  [elementId: string]: string;
}
