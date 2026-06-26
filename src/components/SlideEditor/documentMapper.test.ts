/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { mapDocumentToElements, applyEditsToDocument } from './documentMapper';

const makeMergedData = () => ({
  title: 'Test Document',
  subject: 'Matemáticas',
  grade: '5to',
  bloomObjectives: ['Obj 1', 'Obj 2'],
  concepts: [
    { title: 'Concept A', description: 'Description A', icon: '📌' },
    { title: 'Concept B', description: 'Description B\nLine 2', icon: '📎' },
  ],
  activities: [
    {
      title: 'Activity 1',
      instructions: 'Do this',
      questions: [{ text: 'Q1?', options: ['A', 'B'] }],
    },
  ],
  copyBoxes: ['Copy box 1', 'Copy box 2'],
});

describe('mapDocumentToElements', () => {
  test('creates doc-title element', () => {
    const elements = mapDocumentToElements(makeMergedData());
    const title = elements.find(e => e.id === 'doc-title');
    expect(title).toBeTruthy();
    expect(title?.content).toBe('Test Document');
  });

  test('creates objectives as badges', () => {
    const elements = mapDocumentToElements(makeMergedData());
    const objElements = elements.filter(e => /^doc-obj-\d+$/.test(e.id));
    expect(objElements.length).toBe(2);
  });

  test('creates concept elements', () => {
    const elements = mapDocumentToElements(makeMergedData());
    const concepts = elements.filter(e => e.id.startsWith('doc-concept-'));
    expect(concepts.length).toBeGreaterThan(0);
  });

  test('creates activity elements', () => {
    const elements = mapDocumentToElements(makeMergedData());
    const acts = elements.filter(e => e.id.startsWith('doc-act-'));
    expect(acts.length).toBeGreaterThan(0);
  });

  test('creates copy box elements', () => {
    const elements = mapDocumentToElements(makeMergedData());
    const copies = elements.filter(e => /^doc-copy-\d+$/.test(e.id));
    expect(copies.length).toBe(2);
  });
});

describe('applyEditsToDocument', () => {
  test('applies title edit', () => {
    const data = makeMergedData();
    const edits = { 'doc-title': 'New Title' };
    const result = applyEditsToDocument(data, edits);
    expect(result.title).toBe('New Title');
  });

  test('does not mutate original data', () => {
    const data = makeMergedData();
    const edits = { 'doc-title': 'New Title' };
    applyEditsToDocument(data, edits);
    expect(data.title).toBe('Test Document');
  });

  test('applies copy box edits', () => {
    const data = makeMergedData();
    const edits = { 'doc-copy-0': 'Edited copy box 1' };
    const result = applyEditsToDocument(data, edits);
    expect(result.copyBoxes[0]).toBe('Edited copy box 1');
    expect(result.copyBoxes[1]).toBe('Copy box 2');
  });
});
