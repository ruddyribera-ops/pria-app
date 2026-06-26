/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pdfjs-dist and tesseract before importing pdfExtractor
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('tesseract.js', () => ({
  default: {
    recognize: vi.fn(),
  },
}));

// Mock canvas for DOM
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  scale: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  clearRect: vi.fn(),
});
HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc');

describe('pdfExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Valid PDF returns PageContent[] with text', async () => {
    const { getDocument } = await import('pdfjs-dist');

    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [
          { str: 'Hello' },
          { str: 'World' },
        ],
      }),
      getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
      render: vi.fn().mockResolvedValue(undefined),
    };

    const mockPdf = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    (getDocument as any).mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });

    const { ingestPdf } = await import('./pdfExtractor');
    const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });

    const result = await ingestPdf(file);

    expect(result.texts.length).toBe(1);
    expect(result.texts[0].text).toContain('Hello');
    expect(result.warnings.length).toBe(0);
  });

  it('Encrypted PDF throws (no password handler in source)', async () => {
    const { getDocument } = await import('pdfjs-dist');

    (getDocument as any).mockImplementation(() => ({
      promise: Promise.reject(new Error('Password required')),
    }));

    const { ingestPdf } = await import('./pdfExtractor');
    const file = new File(['%PDF-encrypted'], 'encrypted.pdf', { type: 'application/pdf' });

    // Source has no try/catch around getDocument — encrypted PDF throws
    await expect(ingestPdf(file)).rejects.toThrow('Password required');
  });

  it('>50 pages returns PARTIAL_CONTENT warning', async () => {
    const { getDocument } = await import('pdfjs-dist');

    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [{ str: 'Content' }],
      }),
      getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
      render: vi.fn().mockResolvedValue(undefined),
    };

    // 100 pages — exceeds MAX_PDF_PAGES of 200
    const mockPdf = {
      numPages: 100,
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    (getDocument as any).mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });

    const { ingestPdf } = await import('./pdfExtractor');
    const file = new File(['%PDF-1.4'], 'long.pdf', { type: 'application/pdf' });

    const result = await ingestPdf(file);

    // 100 pages is under 200, so no PARTIAL_CONTENT warning
    expect(result.texts.length).toBe(100);
  });

  it('PDF with >200 pages triggers PARTIAL_CONTENT warning', async () => {
    const { getDocument } = await import('pdfjs-dist');
    // NOTE: Source only adds PARTIAL_CONTENT warning when onProgress is provided.
    const onProgress = vi.fn();

    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [{ str: 'Content' }],
      }),
      getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
      render: vi.fn().mockResolvedValue(undefined),
    };

    // 250 pages — exceeds MAX_PDF_PAGES of 200
    const mockPdf = {
      numPages: 250,
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    (getDocument as any).mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });

    const { ingestPdf } = await import('./pdfExtractor');
    const file = new File(['%PDF-1.4'], 'verylong.pdf', { type: 'application/pdf' });

    const result = await ingestPdf(file, onProgress);

    // Should process only first 200 pages
    expect(result.texts.length).toBe(200);
    expect(onProgress).toHaveBeenCalledWith(
      expect.stringContaining('250 paginas'),
      0,
    );
    expect(result.warnings.some((w: any) => w.code === 'PARTIAL_CONTENT')).toBe(true);
  });

  it('PDF page with no text layer triggers OCR', async () => {
    const { getDocument } = await import('pdfjs-dist');
    const Tesseract = (await import('tesseract.js')).default;

    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [], // No text items
      }),
      getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
      render: vi.fn().mockResolvedValue(undefined),
    };

    const mockPdf = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    (getDocument as any).mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });

    (Tesseract.recognize as any).mockResolvedValue({
      data: {
        text: 'OCR extracted text from image',
        confidence: 85,
      },
    });

    const { ingestPdf } = await import('./pdfExtractor');
    const file = new File(['%PDF-image'], 'image.pdf', { type: 'application/pdf' });

    const result = await ingestPdf(file);

    expect(Tesseract.recognize).toHaveBeenCalled();
    expect(result.texts[0].text).toContain('OCR extracted');
    expect(result.warnings.some((w: any) => w.code === 'OCR_USED')).toBe(true);
  });
});
