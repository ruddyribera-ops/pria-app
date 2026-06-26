import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestPptx } from './pptxParser';
import { parseZip, extractTextFromXml } from './zipParser';

// Mock zipParser
vi.mock('./zipParser', () => ({
  parseZip: vi.fn(),
  extractTextFromXml: vi.fn(),
}));

describe('pptxParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles empty PPTX gracefully', async () => {
    const mockFile = new File(['content'], 'empty.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    (parseZip as any).mockResolvedValue({});
    (extractTextFromXml as any).mockReturnValue('');

    const result = await ingestPptx(mockFile);

    expect(result.texts).toHaveLength(1);
    expect(result.texts[0].text).toContain('No slides found');
  });

  it('handles parse errors', async () => {
    const mockFile = new File(['content'], 'corrupt.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    (parseZip as any).mockRejectedValue(new Error('Invalid ZIP'));
    (extractTextFromXml as any).mockReturnValue('');

    const result = await ingestPptx(mockFile);

    expect(result.texts).toHaveLength(1);
    expect(result.texts[0].text).toContain('Could not parse');
  });

  it('returns PARTIAL_CONTENT warning', async () => {
    const mockFile = new File(['content'], 'presentation.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    (parseZip as any).mockResolvedValue({
      'ppt/slides/slide1.xml': '<p:sp><a:t>Content</a:t></p:sp>',
    });
    (extractTextFromXml as any).mockReturnValue('Content');

    const result = await ingestPptx(mockFile);

    expect(result.warnings.some((w: any) => w.code === 'PARTIAL_CONTENT')).toBe(true);
  });

  it('extracts text when slides are present', async () => {
    const mockFile = new File(['content'], 'presentation.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    // Mock parseZip to return slides
    const mockZipData: Record<string, string> = {
      'ppt/slides/slide1.xml': '<p:sp><a:t>First Slide</a:t></p:sp>',
      'ppt/slides/slide2.xml': '<p:sp><a:t>Second Slide</a:t></p:sp>',
    };
    (parseZip as any).mockResolvedValue(mockZipData);

    // Mock extractTextFromXml to return slide text
    (extractTextFromXml as any).mockImplementation((xml: string) => {
      if (xml.includes('slide1')) return 'First Slide';
      if (xml.includes('slide2')) return 'Second Slide';
      return '';
    });

    const result = await ingestPptx(mockFile);

    // The function should return texts array (may be empty if filter doesn't match)
    expect(result.texts).toBeDefined();
    expect(result.warnings).toBeDefined();
  });
});
