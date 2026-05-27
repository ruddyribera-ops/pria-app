import { describe, it, expect } from 'vitest';
import { formatFileSize, getMockMaterials } from './materials';

describe('formatFileSize', () => {
  it('formats bytes as B', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats KB for values under 1 MB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB');
  });

  it('formats MB for values 1 MB and above', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(1024 * 1024 * 2)).toBe('2.0 MB');
    expect(formatFileSize(Math.round(1024 * 1024 * 3.5))).toBe('3.5 MB');
  });
});

describe('getMockMaterials', () => {
  it('returns array of mock materials', () => {
    const materials = getMockMaterials();
    expect(Array.isArray(materials)).toBe(true);
    expect(materials.length).toBeGreaterThan(0);
  });

  it('each material has id, filename, tipo, size', () => {
    const materials = getMockMaterials();
    materials.forEach(m => {
      expect(m).toHaveProperty('id');
      expect(m).toHaveProperty('filename');
      expect(m).toHaveProperty('tipo');
      expect(m).toHaveProperty('size');
    });
  });
});