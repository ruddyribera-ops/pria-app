import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./pdfExtractor', () => ({
  initPdfWorker: vi.fn(),
  ingestPdf: vi.fn(),
}));

vi.mock('./docxParser', () => ({
  ingestDocx: vi.fn(),
}));

vi.mock('./ocrWorker', () => ({
  ingestImage: vi.fn(),
}));

vi.mock('./textParser', () => ({
  ingestText: vi.fn(),
  ingestHtml: vi.fn(),
}));

vi.mock('./pptxParser', () => ({
  ingestPptx: vi.fn(),
}));

vi.mock('./xlsxParser', () => ({
  ingestXlsx: vi.fn(),
}));

vi.mock('./fileTypeDetector', () => ({
  detectFileType: vi.fn(),
}));

describe('ingestDocument unknown type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok:false for unknown file type', async () => {
    const { detectFileType } = await import('./fileTypeDetector');
    (detectFileType as any).mockReturnValue('unknown');

    const { ingestDocument } = await import('./documentIngester');
    const file = new File(['content'], 'test.xyz', { type: 'application/unknown' });
    const result = await ingestDocument(file);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unsupported/i);
  });

  it('returns ok:true with content for a plain text file', async () => {
    const { detectFileType } = await import('./fileTypeDetector');
    const { ingestText } = await import('./textParser');

    (detectFileType as any).mockReturnValue('text');
    (ingestText as any).mockResolvedValue({
      texts: [{ text: 'Hello world', page: 1 }],
      warnings: [],
    });

    const { ingestDocument } = await import('./documentIngester');
    const file = new File(['Hello world'], 'test.txt', { type: 'text/plain' });
    const result = await ingestDocument(file);

    expect(result.ok).toBe(true);
    expect(result.fullText).toContain('Hello');
  });

  it('PDF ingestion: mock pdfExtractor to return pages → result has content', async () => {
    const { detectFileType } = await import('./fileTypeDetector');
    const { ingestPdf } = await import('./pdfExtractor');

    (detectFileType as any).mockReturnValue('pdf');
    (ingestPdf as any).mockResolvedValue({
      texts: [{ pageNumber: 1, text: 'PDF content here' }],
      warnings: [],
      images: [],
    });

    const { ingestDocument } = await import('./documentIngester');
    const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
    const result = await ingestDocument(file);

    expect(result.ok).toBe(true);
    expect(result.fullText).toContain('PDF content here');
    expect(result.metadata.pageCount).toBe(1);
  });

  it('DOCX ingestion: mock docxParser → result has tables+images', async () => {
    const { detectFileType } = await import('./fileTypeDetector');
    const { ingestDocx } = await import('./docxParser');

    (detectFileType as any).mockReturnValue('docx');
    (ingestDocx as any).mockResolvedValue({
      texts: [{ pageNumber: 1, text: 'DOCX content' }],
      warnings: [],
      tables: [{ headers: ['Name'], rows: [['Test']] }],
      images: [{ dataUrl: 'data:image/png;base64,abc' }],
      charts: [],
    });

    const { ingestDocument } = await import('./documentIngester');
    const file = new File(['PK...'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const result = await ingestDocument(file);

    expect(result.ok).toBe(true);
    expect(result.tables.length).toBeGreaterThan(0);
    expect(result.images.length).toBeGreaterThan(0);
  });

  it('Text ingestion: "Hello world" file → result contains "Hello"', async () => {
    const { detectFileType } = await import('./fileTypeDetector');
    const { ingestText } = await import('./textParser');

    (detectFileType as any).mockReturnValue('text');
    (ingestText as any).mockResolvedValue({
      texts: [{ pageNumber: 1, text: 'Hello world' }],
      warnings: [],
    });

    const { ingestDocument } = await import('./documentIngester');
    const file = new File(['Hello world'], 'hello.txt', { type: 'text/plain' });
    const result = await ingestDocument(file);

    expect(result.ok).toBe(true);
    expect(result.fullText).toContain('Hello');
  });

  it('HTML ingestion: "<p>Hello</p>" → result contains "Hello" (tags stripped)', async () => {
    const { detectFileType } = await import('./fileTypeDetector');
    const { ingestHtml } = await import('./textParser');

    (detectFileType as any).mockReturnValue('html');
    (ingestHtml as any).mockResolvedValue({
      texts: [{ pageNumber: 1, text: 'Hello' }],
      warnings: [],
    });

    const { ingestDocument } = await import('./documentIngester');
    const file = new File(['<p>Hello</p>'], 'test.html', { type: 'text/html' });
    const result = await ingestDocument(file);

    expect(result.ok).toBe(true);
    expect(result.fullText).toContain('Hello');
  });

  it('Image ingestion: PNG file → calls OCR worker', async () => {
    const { detectFileType } = await import('./fileTypeDetector');
    const { ingestImage } = await import('./ocrWorker');

    (detectFileType as any).mockReturnValue('image');
    (ingestImage as any).mockResolvedValue({
      texts: [{ pageNumber: 1, text: 'OCR extracted text' }],
      warnings: [],
      images: ['data:image/png;base64,xyz'],
    });

    const { ingestDocument } = await import('./documentIngester');
    const file = new File([new ArrayBuffer(8)], 'test.png', { type: 'image/png' });
    const result = await ingestDocument(file);

    expect(result.ok).toBe(true);
    expect(ingestImage).toHaveBeenCalled();
    expect(result.fullText).toContain('OCR extracted text');
  });

  it('Unknown type: returns ok:false with error', async () => {
    const { detectFileType } = await import('./fileTypeDetector');
    (detectFileType as any).mockReturnValue('unknown');

    const { ingestDocument } = await import('./documentIngester');
    const file = new File(['content'], 'test.xyz', { type: 'application/x-unknown' });
    const result = await ingestDocument(file);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unsupported/i);
  });

  it('Exception in parser: returns ok:false with error message', async () => {
    const { detectFileType } = await import('./fileTypeDetector');
    const { ingestText } = await import('./textParser');

    (detectFileType as any).mockReturnValue('text');
    (ingestText as any).mockRejectedValue(new Error('Parser crashed'));

    const { ingestDocument } = await import('./documentIngester');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const result = await ingestDocument(file);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/parser crashed/i);
  });
});
