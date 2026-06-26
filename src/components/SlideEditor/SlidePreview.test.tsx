/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SlidePreview from './SlidePreview';
import type { EditorSlide } from './types';
import type { Palette } from '../../lib/pptx/types';

function makePalette(): Palette {
  return {
    name: 'default',
    primary: '#3A9E5E',
    secondary: '#2563EB',
    accent: '#F59E0B',
    bg: '#ffffff',
    textDark: '#1e1e2f',
    textLight: '#6b6b80',
  };
}

function makeCoverSlide(): EditorSlide {
  return {
    id: 'cover',
    type: 'cover',
    label: 'Portada',
    number: 1,
    elements: [
      { id: 'cover-title', type: 'title', content: 'Test Title' },
      { id: 'cover-subtitle', type: 'text', content: 'Test Subject' },
    ],
  };
}

function makeObjectivesSlide(): EditorSlide {
  return {
    id: 'objectives',
    type: 'objectives',
    label: 'Objetivos',
    number: 2,
    elements: [
      { id: 'obj-title', type: 'title', content: '🎯 Objetivos' },
      { id: 'obj-0', type: 'badge', content: 'Obj 1', badgeLabel: 'Recordar', orderIndex: 1 },
    ],
  };
}

function makeContentSlide(): EditorSlide {
  return {
    id: 'content-0',
    type: 'content',
    label: 'Concept A',
    number: 3,
    elements: [
      { id: 'content-title', type: 'title', content: 'Concept A' },
      { id: 'content-para-0', type: 'text', content: 'Para 1' },
    ],
  };
}

describe('SlidePreview', () => {
  test('renders cover slide', () => {
    render(
      <SlidePreview
        slide={makeCoverSlide()}
        palette={makePalette()}
        edits={{}}
        images={{}}
        onUpdateText={() => {}}
        onSetImage={() => {}}
      />
    );
    expect(screen.getByText('Test Title')).toBeTruthy();
  });

  test('renders objectives slide', () => {
    render(
      <SlidePreview
        slide={makeObjectivesSlide()}
        palette={makePalette()}
        edits={{}}
        images={{}}
        onUpdateText={() => {}}
        onSetImage={() => {}}
      />
    );
    expect(screen.getByText('🎯 Objetivos')).toBeTruthy();
  });

  test('renders content slide', () => {
    render(
      <SlidePreview
        slide={makeContentSlide()}
        palette={makePalette()}
        edits={{}}
        images={{}}
        onUpdateText={() => {}}
        onSetImage={() => {}}
      />
    );
    expect(screen.getByText('Concept A')).toBeTruthy();
  });
});
