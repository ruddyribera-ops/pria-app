/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlideEditor } from './useSlideEditor';
import type { MergedData } from './SlideEditorPanel';

const makeMergedData = (): MergedData => ({
  title: 'Test Title',
  subject: 'Matemáticas',
  grade: '5to',
  bloomObjectives: ['Obj 1', 'Obj 2'],
  concepts: [{ title: 'Concept A', description: 'Desc A', icon: '📌' }],
  activities: [],
  copyBoxes: [],
});

describe('useSlideEditor', () => {
  test('returns empty slides when mergedData is null', () => {
    const { result } = renderHook(() => useSlideEditor(null));
    expect(result.current.totalSlides).toBe(0);
    expect(result.current.currentSlide).toBeNull();
  });

  test('maps mergedData to slides', () => {
    const { result } = renderHook(() => useSlideEditor(makeMergedData()));
    expect(result.current.totalSlides).toBeGreaterThan(0);
    expect(result.current.currentSlide).not.toBeNull();
  });

  test('goTo changes currentIndex', () => {
    const { result } = renderHook(() => useSlideEditor(makeMergedData()));
    act(() => { result.current.goTo(1); });
    expect(result.current.currentIndex).toBe(1);
  });

  test('hasEdits is false initially', () => {
    const { result } = renderHook(() => useSlideEditor(makeMergedData()));
    expect(result.current.hasEdits).toBe(false);
  });

  test('updateText sets hasEdits to true', () => {
    const { result } = renderHook(() => useSlideEditor(makeMergedData()));
    act(() => { result.current.updateText('some-id', 'new content'); });
    expect(result.current.hasEdits).toBe(true);
  });

  test('resetEdits clears edits', () => {
    const { result } = renderHook(() => useSlideEditor(makeMergedData()));
    act(() => { result.current.updateText('some-id', 'new content'); });
    expect(result.current.hasEdits).toBe(true);
    act(() => { result.current.resetEdits(); });
    expect(result.current.hasEdits).toBe(false);
  });

  test('next increments currentIndex', () => {
    const { result } = renderHook(() => useSlideEditor(makeMergedData()));
    const before = result.current.currentIndex;
    act(() => { result.current.next(); });
    expect(result.current.currentIndex).toBe(before + 1);
  });

  test('prev decrements currentIndex', () => {
    const { result } = renderHook(() => useSlideEditor(makeMergedData()));
    act(() => { result.current.goTo(2); });
    const before = result.current.currentIndex;
    act(() => { result.current.prev(); });
    expect(result.current.currentIndex).toBe(before - 1);
  });
});
