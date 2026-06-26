import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestDocx } from './docxParser';

// Mock mammoth
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
    convertToHtml: vi.fn(),
  },
}));

// Mock zipParser
vi.mock('./zipParser', () => ({
  parseZip: vi.fn(),
  extractTextFromXml: vi.fn(),
}));

import mammoth from 'mammoth';
import { parseZip, extractTextFromXml } from './zipParser';

describe('docxParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses DOCX to HTML', async () => {
    const mockFile = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    (mammoth.extractRawText as any).mockResolvedValue({
      value: 'Section 1\n\nSection 2',
      messages: [],
    });
    (mammoth.convertToHtml as any).mockResolvedValue({
      value: '<p>Section 1</p><p>Section 2</p>',
      messages: [],
    });
    (parseZip as any).mockResolvedValue({});
    (extractTextFromXml as any).mockReturnValue('');

    const result = await ingestDocx(mockFile);

    expect(result.texts).toBeInstanceOf(Array);
    expect(result.texts.length).toBeGreaterThan(0);
    expect(result.warnings).toBeInstanceOf(Array);
    expect(result.tables).toBeInstanceOf(Array);
    expect(result.images).toBeInstanceOf(Array);
    expect(result.charts).toBeInstanceOf(Array);
  });

  it('handles tables in DOCX', async () => {
    const mockFile = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    (mammoth.extractRawText as any).mockResolvedValue({
      value: 'Header\n\nRow 1 Col 1\nRow 1 Col 2',
      messages: [],
    });
    (mammoth.convertToHtml as any).mockResolvedValue({
      value: '<table><tr><th>Header</th></tr><tr><td>Row 1 Col 1</td><td>Row 1 Col 2</td></tr></table>',
      messages: [],
    });
    (parseZip as any).mockResolvedValue({});
    (extractTextFromXml as any).mockReturnValue('');

    const result = await ingestDocx(mockFile);

    expect(result.tables.length).toBeGreaterThan(0);
  });

  it('handles warnings from mammoth', async () => {
    const mockFile = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    // Mock mammoth with warning messages
    (mammoth.extractRawText as any).mockResolvedValue({
      value: 'Content',
      messages: [{ message: 'Some warning', type: 'warning' }],
    });
    (mammoth.convertToHtml as any).mockResolvedValue({ value: '<p>Content</p>', messages: [] });
    (parseZip as any).mockResolvedValue({});
    (extractTextFromXml as any).mockReturnValue('');

    const result = await ingestDocx(mockFile);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
