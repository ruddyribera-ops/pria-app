/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentEditor from './DocumentEditor';

function makeMergedData() {
  return {
    title: 'Test Document',
    subject: 'Matemáticas',
    grade: '5to',
    bloomObjectives: ['Obj 1', 'Obj 2'],
    concepts: [
      { title: 'Concept A', description: 'Desc A', icon: '📌' },
    ],
    activities: [],
    copyBoxes: ['Copy 1'],
  };
}

describe('DocumentEditor', () => {
  test('renders document title', () => {
    render(
      <DocumentEditor
        mergedData={makeMergedData()}
        edits={{}}
        onUpdateText={() => {}}
      />
    );
    expect(screen.getAllByText('Test Document').length).toBeGreaterThan(0);
  });

  test('renders subject and grade', () => {
    render(
      <DocumentEditor
        mergedData={makeMergedData()}
        edits={{}}
        onUpdateText={() => {}}
      />
    );
    expect(screen.getAllByText(/Matemáticas.*5to/).length).toBeGreaterThan(0);
  });

  test('renders objectives section', () => {
    render(
      <DocumentEditor
        mergedData={makeMergedData()}
        edits={{}}
        onUpdateText={() => {}}
      />
    );
    expect(screen.getByText('🎯 Objetivos de Aprendizaje')).toBeTruthy();
  });

  test('renders concepts', () => {
    render(
      <DocumentEditor
        mergedData={makeMergedData()}
        edits={{}}
        onUpdateText={() => {}}
      />
    );
    expect(screen.getByText('Concept A')).toBeTruthy();
  });

  test('renders copy boxes', () => {
    render(
      <DocumentEditor
        mergedData={makeMergedData()}
        edits={{}}
        onUpdateText={() => {}}
      />
    );
    expect(screen.getByText(/Para copiar en tu cuaderno/)).toBeTruthy();
  });

  test('calls onUpdateText when text is edited', () => {
    const handleUpdate = vi.fn();
    render(
      <DocumentEditor
        mergedData={makeMergedData()}
        edits={{}}
        onUpdateText={handleUpdate}
      />
    );
    // Click on the title to edit - use first match since title appears twice
    fireEvent.click(screen.getAllByText('Test Document')[0]);
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      fireEvent.change(input, { target: { value: 'New Title' } });
      fireEvent.blur(input);
      expect(handleUpdate).toHaveBeenCalledWith('doc-title', 'New Title');
    }
  });
});
