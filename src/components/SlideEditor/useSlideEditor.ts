/**
 * useSlideEditor — manages editable slide state after multi-phase generation.
 * Converts merged results to visual slides, tracks edits, handles image uploads.
 */

import { useState, useCallback, useMemo } from 'react';
import type { EditorSlide, EditsMap, ImageMap } from './types';
import type { Palette } from '../../lib/pptx/types';
import { mapToEditorSlides, getEditorPalette } from './slideMapper';

/** The shape produced by mergePhaseResults() */
interface MergedData {
  title: string;
  subject: string;
  grade: string;
  bloomObjectives: string[];
  concepts: Array<{ title: string; description: string; icon: string }>;
  activities: Array<{ title: string; instructions?: string; questions?: Array<{ text: string; options?: string[] }> }>;
  copyBoxes: string[];
  paginas?: string;
  [key: string]: unknown;
}

export interface SlideEditorReturn {
  /** All visual slides */
  slides: EditorSlide[];
  /** Current slide index */
  currentIndex: number;
  /** Current slide object */
  currentSlide: EditorSlide | null;
  /** Total slide count */
  totalSlides: number;
  /** Whether any edits have been made */
  hasEdits: boolean;
  /** Subject palette */
  palette: Palette;
  /** Go to slide index */
  goTo: (index: number) => void;
  /** Go to next slide */
  next: () => void;
  /** Go to previous slide */
  prev: () => void;
  /** Update an element's text content */
  updateText: (elementId: string, newContent: string) => void;
  /** Set image data for an element */
  setImage: (elementId: string, dataUrl: string) => void;
  /** Reset all edits */
  resetEdits: () => void;
  /** Get the original merged data with user edits applied */
  getEditedData: () => MergedData;
  /** Get image map for PPTX embedding */
  getImageMap: () => ImageMap;
  /** Raw edits map (for display) */
  rawEdits: EditsMap;
  /** Raw images map */
  rawImages: ImageMap;
}

export function useSlideEditor(
  mergedData: MergedData | null,
): SlideEditorReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [edits, setEdits] = useState<EditsMap>({});
  const [images, setImages] = useState<ImageMap>({});

  const slides = useMemo(() => {
    if (!mergedData) return [];
    return mapToEditorSlides(mergedData);
  }, [mergedData]);

  const subject = mergedData?.subject || 'Matemáticas';
  const palette = useMemo(() => getEditorPalette(subject), [subject]);

  // Reset index when slides change
  const safeIndex = Math.min(currentIndex, Math.max(0, slides.length - 1));
  const currentSlide = slides.length > 0 ? slides[safeIndex] : null;
  const totalSlides = slides.length;
  const hasEdits = Object.keys(edits).length > 0 || Object.keys(images).length > 0;

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, slides.length - 1)));
  }, [slides.length]);

  const next = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const updateText = useCallback((elementId: string, newContent: string) => {
    setEdits(prev => ({ ...prev, [elementId]: newContent }));
  }, []);

  const setImage = useCallback((elementId: string, dataUrl: string) => {
    setImages(prev => ({ ...prev, [elementId]: dataUrl }));
  }, []);

  const resetEdits = useCallback(() => {
    setEdits({});
    setImages({});
  }, []);

  /** Merge edits back into the original data for PPTX export */
  const getEditedData = useCallback((): MergedData => {
    if (!mergedData) return null as unknown as MergedData;

    // Deep clone
    const data: MergedData = JSON.parse(JSON.stringify(mergedData));

    // Apply text edits to concepts
    if (data.concepts) {
      data.concepts.forEach((concept, _ci) => {
        // Title edits
        const titleId = `content-title`;
        if (edits[titleId]) {
          concept.title = edits[titleId];
        }

        // Paragraph edits
        const paras = concept.description.split('\n').filter(Boolean);
        paras.forEach((_, pi) => {
          const paraId = `content-para-${pi}`;
          if (edits[paraId]) {
            paras[pi] = edits[paraId];
          }
        });
        concept.description = paras.join('\n');
      });
    }

    // Apply text edits to activities
    if (data.activities) {
      data.activities.forEach((act, _ai) => {
        act.questions?.forEach((q, qi) => {
          const qId = `act-q-${qi}`;
          if (edits[qId]) {
            q.text = edits[qId].replace(/^\d+\.\s*/, '');
          }
        });
      });
    }

    // Apply copy box edits
    if (data.copyBoxes) {
      data.copyBoxes.forEach((_, ci) => {
        const copyId = `copy-${ci}`;
        if (edits[copyId]) {
          data.copyBoxes[ci] = edits[copyId];
        }
      });
    }

    // Apply cover edits
    if (edits['cover-title']) {
      data.title = edits['cover-title'];
    }

    // Apply objective edits
    if (data.bloomObjectives) {
      data.bloomObjectives.forEach((_, oi) => {
        const objId = `obj-${oi}`;
        if (edits[objId]) {
          data.bloomObjectives[oi] = edits[objId];
        }
      });
    }

    return data;
  }, [mergedData, edits]);

  const getImageMap = useCallback((): ImageMap => {
    return { ...images };
  }, [images]);

  return {
    slides,
    currentIndex: safeIndex,
    currentSlide,
    totalSlides,
    hasEdits,
    palette,
    goTo,
    next,
    prev,
    updateText,
    setImage,
    resetEdits,
    getEditedData,
    getImageMap,
    rawEdits: edits,
    rawImages: images,
  };
}
