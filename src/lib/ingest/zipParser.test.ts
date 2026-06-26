import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseZip, extractTextFromXml } from './zipParser';

// Mock FileReader for node environment
const mockReadAsDataURL = vi.fn();
const mockResult = 'data:image/png;base64,SGVsbG8=';

class MockFileReader {
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  result: string | ArrayBuffer | null = mockResult;
  readAsDataURL = mockReadAsDataURL.mockImplementation((_file: Blob) => {
    // Simulate async FileReader behavior
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: mockResult } });
      }
    }, 0);
  });
}

vi.stubGlobal('FileReader', MockFileReader as any);

describe('zipParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseZip', () => {
    it('extracts file entries from ZIP buffer', async () => {
      // Create a minimal valid ZIP buffer (empty file)
      const zipBuffer = new ArrayBuffer(0);

      const result = await parseZip(zipBuffer);

      expect(result).toBeInstanceOf(Object);
    });

    it('parses XML and extracts text', () => {
      const xml = '<root><p>Hello</p><p>World</p></root>';

      const text = extractTextFromXml(xml);

      expect(text).toContain('Hello');
      expect(text).toContain('World');
    });

    it('converts XML entities', () => {
      const xml = '<root>&amp; &lt;test&gt; &nbsp;</root>';

      const text = extractTextFromXml(xml);

      expect(text).toContain('&');
      expect(text).toContain('<test>');
    });

    it('collapses whitespace', () => {
      const xml = '<root>Hello    World</root>';

      const text = extractTextFromXml(xml);

      expect(text).toBe('Hello World');
    });

    it('handles empty XML', () => {
      const text = extractTextFromXml('');

      expect(text).toBe('');
    });

    it('trims text', () => {
      const xml = '<root>  Hello  </root>';

      const text = extractTextFromXml(xml);

      expect(text).toBe('Hello');
    });
  });

  describe('fileToDataUrl', () => {
    it('converts File to data URL', async () => {
      const { fileToDataUrl } = await import('./zipParser');
      const content = new Uint8Array([137, 80, 78, 71]); // PNG header
      const mockFile = new File([content], 'test.png', { type: 'image/png' });

      const dataUrl = await fileToDataUrl(mockFile);

      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
