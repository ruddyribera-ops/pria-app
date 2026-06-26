/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { mapToEditorSlides, getEditorPalette } from './slideMapper';
import type { MergedData } from './SlideEditorPanel';

const makeMergedData = (): MergedData => ({
  title: 'Test Title',
  subject: 'Matemáticas',
  grade: '5to',
  bloomObjectives: ['Obj 1', 'Obj 2'],
  concepts: [
    { title: 'Concept A', description: 'Description A', icon: '📌' },
    { title: 'Concept B', description: 'Description B', icon: '📎' },
  ],
  activities: [
    {
      title: 'Activity 1',
      instructions: 'Instructions here',
      questions: [{ text: 'Q1?', options: ['A', 'B'] }],
    },
  ],
  copyBoxes: ['Copy 1', 'Copy 2', 'Copy 3'],
});

describe('mapToEditorSlides', () => {
  test('creates at least 1 slide (cover)', () => {
    const slides = mapToEditorSlides(makeMergedData());
    expect(slides.length).toBeGreaterThanOrEqual(1);
  });

  test('first slide is cover type', () => {
    const slides = mapToEditorSlides(makeMergedData());
    expect(slides[0].type).toBe('cover');
  });

  test('creates objectives slide when bloomObjectives present', () => {
    const slides = mapToEditorSlides(makeMergedData());
    const objSlide = slides.find(s => s.type === 'objectives');
    expect(objSlide).toBeTruthy();
  });

  test('creates content slides for concepts', () => {
    const slides = mapToEditorSlides(makeMergedData());
    const contentSlides = slides.filter(s => s.type === 'content');
    expect(contentSlides.length).toBeGreaterThanOrEqual(2);
  });

  test('cover slide has title element', () => {
    const slides = mapToEditorSlides(makeMergedData());
    const cover = slides.find(s => s.type === 'cover');
    expect(cover?.elements.some(e => e.id === 'cover-title')).toBe(true);
  });

  test('activity slide has title', () => {
    const slides = mapToEditorSlides(makeMergedData());
    const actSlide = slides.find(s => s.type === 'activity');
    expect(actSlide).toBeTruthy();
    expect(actSlide?.elements.some(e => e.id === 'act-title')).toBe(true);
  });
});

describe('getEditorPalette', () => {
  test('returns palette for Matemáticas', () => {
    const palette = getEditorPalette('Matemáticas');
    expect(palette).toBeTruthy();
    expect(palette.primary).toBeTruthy();
  });

  test('returns palette for any subject string', () => {
    const palette = getEditorPalette('Historia');
    expect(palette).toBeTruthy();
    expect(typeof palette.primary).toBe('string');
  });
});
