import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestText, ingestHtml } from './textParser';

describe('textParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ingestText', () => {
    it('parses plain text into paragraphs', async () => {
      const content = 'First paragraph\n\nSecond paragraph\n\nThird paragraph';
      const mockFile = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await ingestText(mockFile);

      expect(result.texts).toHaveLength(3);
      expect(result.texts[0].text).toBe('First paragraph');
      expect(result.texts[1].text).toBe('Second paragraph');
      expect(result.texts[2].text).toBe('Third paragraph');
      expect(result.warnings).toHaveLength(0);
    });

    it('handles empty file', async () => {
      const mockFile = new File([''], 'empty.txt', { type: 'text/plain' });

      const result = await ingestText(mockFile);

      expect(result.texts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('filters out empty paragraphs', async () => {
      const content = 'Valid\n\n\n\n   \n\nEmpty';
      const mockFile = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await ingestText(mockFile);

      expect(result.texts).toHaveLength(2);
      expect(result.texts[0].text).toBe('Valid');
      expect(result.texts[1].text).toBe('Empty');
    });
  });

  describe('ingestHtml', () => {
    it('strips HTML tags and returns text', async () => {
      const html = '<html><head><style>.hidden{display:none}</style></head><body><p>Hello <b>World</b></p><script>alert("hi")</script></body></html>';
      const mockFile = new File([html], 'test.html', { type: 'text/html' });

      const result = await ingestHtml(mockFile);

      expect(result.texts[0].text).toContain('Hello');
      expect(result.texts[0].text).toContain('World');
      // Script and style content should be removed
      expect(result.texts[0].text).not.toContain('hidden');
      expect(result.texts[0].text).not.toContain('alert');
    });

    it('handles HTML entities', async () => {
      const html = '<p>Hello &amp; World &lt;test&gt;</p>';
      const mockFile = new File([html], 'test.html', { type: 'text/html' });

      const result = await ingestHtml(mockFile);

      expect(result.texts[0].text).toContain('Hello & World');
      expect(result.texts[0].text).toContain('<test>');
    });
  });
});
