/**
 * documentIngester.ts — Universal Document Ingestion (Browser-Based)
 * ================================================================
 * Ingests: PDF, DOCX, Images (JPEG/PNG/WebP with OCR), plain text.
 * Output: Unified IngestResult schema — bridges to Motor_Alpha-2 curriculum extraction.
 *
 * This file re-exports from sub-modules + provides the main ingestDocument() router.
 */

// Initialize pdfjs worker once at module load
import { initPdfWorker } from './pdfExtractor';
initPdfWorker();

// Re-export all public types
export type {
  FileType,
  PageContent,
  IngestMetadata,
  IngestWarning,
  TableData,
  ImageData,
  ChartData,
  HeaderFooterContent,
  FootnoteItem,
  IngestResult,
  CurriculumResult,
} from './types';

// Re-export all parser functions
export { detectFileType } from './fileTypeDetector';
export { ingestPdf } from './pdfExtractor';
export { ingestDocx } from './docxParser';
export { ingestImage } from './ocrWorker';
export { ingestText, ingestHtml } from './textParser';
export { ingestPptx } from './pptxParser';
export { ingestXlsx } from './xlsxParser';
export { parseZip, extractTextFromXml, fileToDataUrl } from './zipParser';
export { extractCurriculum, ingestAndExtract, extractCurriculumWithAI } from './curriculumExtractor';

// Import parsers for the router
import { detectFileType } from './fileTypeDetector';
import { ingestPdf } from './pdfExtractor';
import { ingestDocx } from './docxParser';
import { ingestImage } from './ocrWorker';
import { ingestText, ingestHtml } from './textParser';
import { ingestPptx } from './pptxParser';
import { ingestXlsx } from './xlsxParser';
import type { IngestResult, IngestMetadata } from './types';

/**
 * Ingest any supported file → unified IngestResult.
 * Auto-detects file type from MIME + extension.
 */
export async function ingestDocument(file: File, onProgress?: (stage: string, percent: number) => void): Promise<IngestResult> {
  const fileType = detectFileType(file);

  if (fileType === 'unknown') {
    return {
      ok: false,
      texts: [],
      fullText: '',
      metadata: { fileName: file.name, fileType, fileSize: file.size, pageCount: 0, language: 'unknown' },
      tables: [],
      images: [],
      warnings: [],
      error: `Unsupported file type: ${file.type || 'unknown'}`,
    };
  }

  try {
    let texts: import('./types').PageContent[] = [];
    let warnings: import('./types').IngestWarning[] = [];
    let tables: string[][] = [];
    let images: string[] = [];
    let fullText = '';

    switch (fileType) {
      case 'pdf': {
        const result = await ingestPdf(file, onProgress);
        texts = result.texts;
        warnings = result.warnings;
        images = result.images || [];
        if (onProgress) onProgress('Finalizando...', 95);
        break;
      }
      case 'docx': {
        const result = await ingestDocx(file);
        texts = result.texts;
        warnings = result.warnings;
        for (const t of result.tables) tables.push(...[[...t.headers], ...t.rows]);
        images = result.images.map(img => img.dataUrl);
        for (const chart of result.charts) {
          warnings.push({ code: 'CHART_DETECTED', message: `Chart detected: ${chart.title} (type: ${chart.type}) — chart rendering not yet supported` });
        }
        break;
      }
      case 'image': {
        const result = await ingestImage(file, onProgress);
        texts = result.texts;
        warnings = result.warnings;
        images = result.images;
        break;
      }
      case 'text': {
        const result = await ingestText(file);
        texts = result.texts;
        warnings = result.warnings;
        break;
      }
      case 'html': {
        const result = await ingestHtml(file);
        texts = result.texts;
        warnings = result.warnings;
        break;
      }
      case 'pptx': {
        const result = await ingestPptx(file);
        texts = result.texts;
        warnings = result.warnings;
        break;
      }
      case 'xlsx': {
        const result = await ingestXlsx(file);
        texts = result.texts;
        warnings = result.warnings;
        tables = result.tables;
        break;
      }
    }

    fullText = texts.map(p => p.text).join('\n\n').trim();
    const metadata: IngestMetadata = {
      fileName: file.name,
      fileType,
      fileSize: file.size,
      pageCount: texts.length,
      language: 'es',
    };

    return { ok: true, texts, fullText, metadata, tables, images, warnings };
  } catch (err) {
    return {
      ok: false,
      texts: [],
      fullText: '',
      metadata: { fileName: file.name, fileType, fileSize: file.size, pageCount: 0, language: 'unknown' },
      tables: [],
      images: [],
      warnings: [],
      error: `Ingestion failed: ${err}`,
    };
  }
}
