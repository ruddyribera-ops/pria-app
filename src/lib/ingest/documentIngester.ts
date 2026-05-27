/**
 * documentIngester.ts — Universal Document Ingestion (Browser-Based)
 * ================================================================
 * Ingests: PDF, DOCX, Images (JPEG/PNG/WebP with OCR), plain text.
 * Output: Unified IngestResult schema → bridges to Motor_Alpha-2 curriculum extraction.
 *
 * Runs entirely in the browser. No server required for local file ingestion.
 * YouTube/URL support requires backend service (Phase 2).
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import { callMinimax } from '../ai/minimaxClient';
import alpha2Prompt from '../../prompts/Motor_Alpha-2.md?raw';

// Configure pdfjs-dist worker
// Vite bundles this automatically — use the CDN fallback that matches our version
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────

export type FileType =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'image'
  | 'text'
  | 'html'
  | 'unknown';

export interface PageContent {
  pageNumber: number;
  text: string;
  pageUrl?: string; // for PDF pages rendered as images
}

export interface IngestMetadata {
  fileName: string;
  fileType: FileType;
  fileSize: number;
  pageCount: number;
  language: string;
  title?: string;
  author?: string;
  lastModified?: string;
}

export interface IngestWarning {
  code: 'OCR_USED' | 'PARTIAL_CONTENT' | 'IMAGE_QUALITY_LOW' | 'UNSUPPORTED_ELEMENTS' | 'CHART_DETECTED';
  message: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface ImageData {
  filename: string;
  dataUrl: string;
  width?: number;
  height?: number;
}

export interface ChartData {
  title: string;
  type: string; // bar, line, pie, etc.
  embedded: boolean; // true if chart is embedded as image
  imageDataUrl?: string; // if embedded as image
}

export interface HeaderFooterContent {
  header?: string;
  footer?: string;
}

export interface FootnoteItem {
  id: number;
  text: string;
}

export interface IngestResult {
  /** Success flag */
  ok: boolean;
  /** Unified extracted texts (one per logical section/page) */
  texts: PageContent[];
  /** Overall extracted text (concatenated) */
  fullText: string;
  /** Document metadata */
  metadata: IngestMetadata;
  /** Extracted tables (as CSV strings) */
  tables: string[][];
  /** Extracted image data URLs (base64) — for visual curriculum */
  images: string[];
  /** Processing warnings */
  warnings: IngestWarning[];
  /** Raw error if ok=false */
  error?: string;
}

// Curriculum extraction output (Motor_Alpha-2 schema)
export interface CurriculumResult {
  unidad_real: string;
  temas: string[];
  contenido_temas: Record<string, string>;
  paginas_temas: Record<string, string>;
}

// ──────────────────────────────────────────────────
// File type detection
// ──────────────────────────────────────────────────

export function detectFileType(file: File): FileType {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = file.type;

  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') return 'docx';
  if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === 'pptx') return 'pptx';
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || ext === 'xlsx') return 'xlsx';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
  if (mime === 'text/plain' || ext === 'txt') return 'text';
  if (mime === 'text/html' || ext === 'html') return 'html';

  return 'unknown';
}

// ──────────────────────────────────────────────────
// PDF Ingestion (pdfjs-dist)
// ──────────────────────────────────────────────────

async function ingestPdf(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[]; images: string[] }> {
  const warnings: IngestWarning[] = [];
  const texts: PageContent[] = [];
  const images: string[] = [];

  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  console.log('[ingestPdf] Loaded PDF with ' + pageCount + ' pages');

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const itemCount = content.items.length;
    console.log('[ingestPdf] Page ' + i + ' has ' + itemCount + ' text items');

    if (itemCount === 0) {
      // No text layer — render page as image and OCR
      warnings.push({ code: 'OCR_USED', message: 'Page ' + i + ' has no text layer — running OCR' });

      try {
        console.log('[ingestPdf] Page ' + i + ' running OCR...');
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas context');

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        images.push(dataUrl);

        // Run tesseract OCR
        const { data } = await Tesseract.recognize(dataUrl, 'eng+spa', {
          logger: () => {},
        });

        const ocrText = (data && data.text) ? data.text.trim() : '';
        console.log('[ingestPdf] Page ' + i + ' OCR done, text length: ' + ocrText.length + ', confidence: ' + (data ? Math.round(data.confidence || 0) : 0) + '%');
        texts.push({ pageNumber: i, text: ocrText, pageUrl: dataUrl });

        if (data && typeof data.confidence === 'number' && data.confidence < 70) {
          warnings.push({ code: 'IMAGE_QUALITY_LOW', message: 'Page ' + i + ' OCR confidence only ' + Math.round(data.confidence) + '%' });
        }
      } catch (e) {
        console.error('[ingestPdf] Page ' + i + ' OCR failed:', e);
        warnings.push({ code: 'OCR_USED', message: 'Page ' + i + ' OCR failed' });
        texts.push({ pageNumber: i, text: '' });
      }
      continue;
    }

    // Text layer exists — extract normally
    const pageText = content.items
      .map((item: any) => {
        if ('str' in item) return item.str;
        return '';
      })
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    texts.push({ pageNumber: i, text: pageText });
  }

  return { texts, warnings, images };
}

// ──────────────────────────────────────────────────
// DOCX Ingestion (mammoth)
// ──────────────────────────────────────────────────

async function ingestDocx(file: File): Promise<{
  texts: PageContent[];
  warnings: IngestWarning[];
  tables: TableData[];
  images: ImageData[];
  charts: ChartData[];
  headersFooters: HeaderFooterContent;
  footnotes: FootnoteItem[];
}> {
  const warnings: IngestWarning[] = [];
  const tables: TableData[] = [];
  const images: ImageData[] = [];
  const charts: ChartData[] = [];
  const headersFooters: HeaderFooterContent = {};
  const footnotes: FootnoteItem[] = [];
  const arrayBuffer = await file.arrayBuffer();

  // ── Step 1: Extract raw text (same as before) ──────────────────────────
  const rawResult = await mammoth.extractRawText({ arrayBuffer });
  const fullText = rawResult.value;

  if (rawResult.messages.length > 0) {
    warnings.push({
      code: 'PARTIAL_CONTENT',
      message: `DOCX parse had ${rawResult.messages.length} warning(s): ${rawResult.messages.map(m => m.message).join('; ')}`,
    });
  }

  const sections = fullText.split(/\n\n+/).filter(s => s.trim().length > 0);
  const texts = sections.map((text, i) => ({ pageNumber: i + 1, text: text.trim() }));

  if (texts.length === 1 && fullText.length > 500) {
    const paragraphs = fullText.split(/\n/).filter(s => s.trim().length > 20);
    texts.length = 0;
    paragraphs.forEach((p, i) => texts.push({ pageNumber: i + 1, text: p.trim() }));
  }

  // ── Step 2: Extract tables + images via HTML conversion ─────────────────
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value;

    // Parse tables from HTML
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[0];
      const headers: string[] = [];
      const rows: string[][] = [];

      // Extract headers (th cells)
      const thMatches = tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi);
      for (const m of thMatches) {
        headers.push(m[1].replace(/<[^>]+>/g, '').trim());
      }

      // Extract rows (td cells)
      const trMatches = tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      for (const rowMatch of trMatches) {
        const rowHtml = rowMatch[1];
        const tdMatches = rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        const row: string[] = [];
        for (const m of tdMatches) {
          row.push(m[1].replace(/<[^>]+>/g, '').trim());
        }
        if (row.length > 0) rows.push(row);
      }

      if (rows.length > 0) {
        tables.push({ headers: headers.length > 0 ? headers : [], rows });
      }
    }

    if (htmlResult.messages.length > 0) {
      warnings.push({
        code: 'PARTIAL_CONTENT',
        message: `HTML conversion had ${htmlResult.messages.length} issue(s): ${htmlResult.messages.map(m => m.message).join('; ')}`,
      });
    }
  } catch {
    warnings.push({ code: 'PARTIAL_CONTENT', message: 'Could not extract tables from DOCX' });
  }

  // ── Step 3: Extract images from word/media/ ─────────────────────────────
  try {
    const zip = await parseZip(arrayBuffer);
    const mediaKeys = Object.keys(zip).filter(k => k.match(/word\/media\//));

    for (const key of mediaKeys) {
      const filename = key.split('/').pop() ?? key;
      const raw = zip[key];

      // Determine MIME type from extension
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
        svg: 'image/svg+xml',
      };
      const mime = mimeMap[ext] ?? 'image/png';

      // raw may be base64-encoded or binary. Check if it looks like base64.
      let dataUrl: string;
      if (raw.startsWith('/9j/') || raw.startsWith('iVBOR')) {
        dataUrl = `data:${mime};base64,${raw}`;
      } else if (raw.charCodeAt(0) === 0x89 && ext === 'png') {
        // Binary PNG signature — skip binary-only entries
        continue;
      } else {
        dataUrl = `data:${mime};base64,${btoa(raw)}`;
      }

      images.push({ filename, dataUrl });
    }
  } catch {
    // skip image extraction on error
  }

  // ── Step 4: Extract headers and footers ────────────────────────────────
  try {
    const zip = await parseZip(arrayBuffer);

    // Headers: word/header*.xml
    const headerKeys = Object.keys(zip)
      .filter(k => k.match(/word\/header\d*\.xml/i))
      .sort();

    if (headerKeys.length > 0) {
      const headerTexts: string[] = [];
      for (const key of headerKeys) {
        const text = extractTextFromXml(zip[key]);
        if (text.trim()) headerTexts.push(text.trim());
      }
      if (headerTexts.length > 0) headersFooters.header = headerTexts.join(' | ');
    }

    // Footers: word/footer*.xml
    const footerKeys = Object.keys(zip)
      .filter(k => k.match(/word\/footer\d*\.xml/i))
      .sort();

    if (footerKeys.length > 0) {
      const footerTexts: string[] = [];
      for (const key of footerKeys) {
        const text = extractTextFromXml(zip[key]);
        if (text.trim()) footerTexts.push(text.trim());
      }
      if (footerTexts.length > 0) headersFooters.footer = footerTexts.join(' | ');
    }
  } catch {
    // skip headers/footers on error
  }

  // ── Step 5: Extract footnotes ────────────────────────────────────────────
  try {
    const zip = await parseZip(arrayBuffer);
    const footnoteKey = Object.keys(zip).find(k => k.match(/word\/footnotes\.xml/i));

    if (footnoteKey) {
      const footnoteXml = zip[footnoteKey];
      // Parse footnote references: <w:footnoteRef> and their text
      // Footnotes look like: <w:footnote w:id="1"><w:p><w:r><w:t>text</w:t></w:r></w:p></w:footnote>
      const footnoteRegex = /<w:footnote[^>]*\sid="(\d+)"[^>]*>([\s\S]*?)<\/w:footnote>/gi;
      let match;
      while ((match = footnoteRegex.exec(footnoteXml)) !== null) {
        const id = parseInt(match[1], 10);
        const footnoteText = extractTextFromXml(match[2]);
        if (footnoteText.trim()) {
          footnotes.push({ id, text: footnoteText.trim() });
        }
      }
    }
  } catch {
    // skip footnotes on error
  }

  // ── Step 6: Detect charts (check for embedded chart files) ───────────────
  try {
    const zip = await parseZip(arrayBuffer);

    // Charts are in word/charts/ or xl/charts/
    const chartKeys = Object.keys(zip).filter(k =>
      k.match(/word\/charts\//i) || k.match(/xl\/charts\//i)
    );

    for (const key of chartKeys) {
      if (key.endsWith('.xml.rels') || key.endsWith('_rels/')) continue;
      if (key.endsWith('.xml')) {
        const chartXml = zip[key];
        // Try to detect chart type from XML
        let chartType = 'unknown';
        if (chartXml.includes('c:barChart')) chartType = 'bar';
        else if (chartXml.includes('c:lineChart')) chartType = 'line';
        else if (chartXml.includes('c:pieChart')) chartType = 'pie';
        else if (chartXml.includes('c:areaChart')) chartType = 'area';

        charts.push({
          title: key.split('/').pop()?.replace('.xml', '') ?? 'Chart',
          type: chartType,
          embedded: true, // chart XML exists but not rendered as image yet
        });
      }
    }
  } catch {
    // skip charts on error
  }

  return { texts, warnings, tables, images, charts, headersFooters, footnotes };
}

// ──────────────────────────────────────────────────
// Image ingestion (tesseract.js — browser OCR)
// ──────────────────────────────────────────────────

async function ingestImage(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[]; images: string[] }> {
  const warnings: IngestWarning[] = [];
  const texts: PageContent[] = [];
  const images: string[] = [];

  // Convert to data URL for display
  const dataUrl = await fileToDataUrl(file);
  images.push(dataUrl);

  try {
    // Run Tesseract OCR (browser-native, no server needed)
    const { data } = await Tesseract.recognize(dataUrl, 'eng+spa', {
      logger: () => {}, // silent
    });

    const ocrText = data.text;
    texts.push({ pageNumber: 1, text: ocrText });

    if (data.confidence < 70) {
      warnings.push({ code: 'IMAGE_QUALITY_LOW', message: `OCR confidence only ${Math.round(data.confidence)}% — results may contain errors` });
    }

    // Also detect if this is a textbook/page image (multiple columns possible)
    if (data.blocks && data.blocks.length > 1) {
      warnings.push({ code: 'PARTIAL_CONTENT', message: 'Multiple text blocks detected — content may span columns' });
    }
  } catch (err) {
    warnings.push({ code: 'OCR_USED', message: `OCR failed: ${err}` });
    texts.push({ pageNumber: 1, text: '' });
  }

  return { texts, warnings, images };
}

// ──────────────────────────────────────────────────
// Plain text ingestion
// ──────────────────────────────────────────────────

async function ingestText(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[] }> {
  const warnings: IngestWarning[] = [];
  const text = await file.text();

  const paragraphs = text.split(/\n{2,}/).filter(s => s.trim().length > 0);
  const texts = paragraphs.map((p, i) => ({
    pageNumber: i + 1,
    text: p.trim(),
  }));

  return { texts, warnings };
}

// ──────────────────────────────────────────────────
// HTML ingestion (strip tags, extract text)
// ──────────────────────────────────────────────────

async function ingestHtml(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[] }> {
  const warnings: IngestWarning[] = [];
  const html = await file.text();

  // Simple HTML tag stripper
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const paragraphs = text.split(/\n{2,}/).filter(s => s.trim().length > 10);
  const texts = paragraphs.map((p, i) => ({
    pageNumber: i + 1,
    text: p.trim(),
  }));

  return { texts, warnings };
}

// ──────────────────────────────────────────────────
// PPTX ingestion (basic — XML unzip + extract text)
// ──────────────────────────────────────────────────

async function ingestPptx(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[] }> {
  const warnings: IngestWarning[] = [
    { code: 'PARTIAL_CONTENT', message: 'PPTX support is basic — extracts text only, no slides/charts' },
  ];

  // PPTX is a ZIP file — read via browser's JSZip-like approach using raw zip
  // For now, return placeholder — PPTX requires JSZip which isn't installed
  // We'll do a minimal approach using the file as a zip via Blob
  const texts: PageContent[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await parseZip(arrayBuffer);
    const slideTexts: string[] = [];

    // PPTX slides are in ppt/slides/slideN.xml
    const slideKeys = Object.keys(zip).filter(k => k.match(/ppt\/slides\/slide\d+\.xml/)).sort();

    if (slideKeys.length === 0) {
      return { texts: [{ pageNumber: 1, text: '[PPTX] No slides found in file' }], warnings };
    }

    for (const key of slideKeys) {
      const slideXml = zip[key];
      const slideText = extractTextFromXml(slideXml);
      if (slideText.trim()) slideTexts.push(slideText.trim());
    }

    texts.push(...slideTexts.map((t, i) => ({ pageNumber: i + 1, text: t })));
  } catch {
    texts.push({ pageNumber: 1, text: '[PPTX] Could not parse — file may be corrupted or password-protected' });
  }

  return { texts, warnings };
}

// ──────────────────────────────────────────────────
// XLSX ingestion (basic)
// ──────────────────────────────────────────────────

async function ingestXlsx(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[]; tables: string[][] }> {
  const warnings: IngestWarning[] = [
    { code: 'PARTIAL_CONTENT', message: 'XLSX support extracts first sheet as CSV-like text' },
  ];
  const tables: string[][] = [];

  // Basic XLSX text extraction via XML parsing
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await parseZip(arrayBuffer);

    // Sheet1 is usually xl/worksheets/sheet1.xml
    const sheetKey = Object.keys(zip).find(k => k.match(/xl\/worksheets\/sheet1\.xml/));
    if (sheetKey) {
      const sheetXml = zip[sheetKey];
      const text = extractTextFromXml(sheetXml);
      // Parse as CSV-like (rows separated by newline, cells by tab)
      const rows = text.split(/\r?\n/).filter(r => r.trim());
      tables.push(...rows.map(r => r.split(/\t/)));
    }
  } catch {
    // ignore
  }

  return { texts: [{ pageNumber: 1, text: `[XLSX] ${tables.length} rows extracted` }], warnings, tables };
}

// ──────────────────────────────────────────────────
// Utility helpers
// ──────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function extractTextFromXml(xml: string): string {
  // Extract text content from simple XML (no namespaces)
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ──────────────────────────────────────────────────
// Simple ZIP parser (no external lib needed)
// Handles: stored (method 0) and deflate (method 8)
// ──────────────────────────────────────────────────

async function parseZip(buffer: ArrayBuffer): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8', { fatal: false });

  let offset = 0;
  const entries: { name: string; off: number; csize: number; usize: number; method: number }[] = [];

  while (offset < buffer.byteLength - 30) {
    const sig = readU32(view, offset);
    if (sig === 0x04034b50) {
      const nameLen = readU16(view, offset + 26);
      const extraLen = readU16(view, offset + 28);
      const method = readU16(view, offset + 8);
      const csize = readU32(view, offset + 18);
      const usize = readU32(view, offset + 22);
      const nameBytes = new Uint8Array(buffer, offset + 30, nameLen);
      const name = decoder.decode(nameBytes).replace(/\\/g, '/');

      entries.push({ name, off: offset + 30 + nameLen + extraLen, csize, usize, method });
      offset += 30 + nameLen + extraLen + csize;
    } else if (sig === 0x02014b50 || sig === 0x06054b50) {
      break;
    } else {
      offset++;
    }
  }

  for (const entry of entries) {
    if (!entry.name || entry.name.endsWith('/')) continue;

    try {
      let data: Uint8Array;

      if (entry.method === 0) {
        // Stored — no compression
        data = new Uint8Array(buffer, entry.off, entry.csize);
      } else if (entry.method === 8) {
        // Deflate — use browser DecompressionStream
        const sliced = buffer.slice(entry.off, entry.off + entry.csize);
        const ds = new DecompressionStream('deflate');
        const blob = new Blob([sliced]);
        blob.stream().pipeTo(ds.writable);
        // Read the decompressed output
        const decompressed = await new Response(ds.readable).arrayBuffer();
        data = new Uint8Array(decompressed);
      } else {
        continue;
      }

      result[entry.name] = decoder.decode(data);
    } catch {
      // Skip corrupted entries silently
    }
  }

  return result;
}

/**
 * Ingest any supported file → unified IngestResult.
 * Auto-detects file type from MIME + extension.
 */
export async function ingestDocument(file: File): Promise<IngestResult> {
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
    let texts: PageContent[] = [];
    let warnings: IngestWarning[] = [];
    let tables: string[][] = [];
    let images: string[] = [];
    let fullText = '';

    switch (fileType) {
      case 'pdf': {
        const result = await ingestPdf(file);
        texts = result.texts;
        warnings = result.warnings;
        images = result.images || [];
        break;
      }
      case 'docx': {
        const result = await ingestDocx(file);
        texts = result.texts;
        warnings = result.warnings;
        // tables — flatten TableData rows to string[][]
        for (const t of result.tables) {
          tables.push(...[[...t.headers], ...t.rows]);
        }
        // images — extract dataUrl strings
        images = result.images.map(img => img.dataUrl);
        // charts — embed as info warnings (chart rendering not yet supported)
        for (const chart of result.charts) {
          warnings.push({
            code: 'CHART_DETECTED',
            message: `Chart detected: ${chart.title} (type: ${chart.type}) — chart rendering not yet supported`,
          });
        }
        break;
      }
      case 'image': {
        const result = await ingestImage(file);
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
      language: 'es', // default for PRIA (Spanish-first)
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

// ──────────────────────────────────────────────────
// Motor_Alpha-2 Bridge — Extract curriculum from IngestResult
// ──────────────────────────────────────────────────

/**
 * Parse an IngestResult and extract Motor_Alpha-2 curriculum schema:
 * { unidad_real, temas[], contenido_temas{}, paginas_temas{} }
 *
 * Heuristics:
 * - First heading-like line = unit name
 * - Lines starting with numbers/hashes = topics
 * - Page ranges detected via "p.X-Y" or "pp. X-Y" patterns
 */
export function extractCurriculum(ingest: IngestResult, _grado_nivel: string = '5to Primaria'): CurriculumResult {
  if (!ingest.ok || !ingest.fullText) {
    return { unidad_real: 'Sin datos', temas: [], contenido_temas: {}, paginas_temas: {} };
  }

  const fullText = ingest.fullText;
  const lines = fullText.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);

  // ── 1. Detect unit name ──────────────────────────────────────────
  let unidad_real = 'Unidad sin nombre';

  // Look for patterns like "Unidad 1: Title" or " Unidad 1 — Title"
  const unitMatch = fullText.match(/(?:Unidad|Unit)[^\n]{0,80}/i);
  if (unitMatch) {
    unidad_real = unitMatch[0].slice(0, 80).trim();
  } else if (lines[0]) {
    unidad_real = lines[0].slice(0, 80);
  }

  // ── 2. Detect topics ────────────────────────────────────────────────
  // Topics are lines that look like: "1. Topic", "1.1 Topic", "- Topic", "## Topic"
  // Also: "Tema 1:", "Lección:", "Capítulo:", etc.
  const topicPatterns = [
    /^(?:\d+\.?\d*\s*[):\.]\s*)(.+)/,           // "1. Topic" or "1) Topic"
    /^[-*•]\s+(.+)/,                              // "- Topic" or "* Topic"
    /^(?:TEMA|LECCIÓN|CAPÍTULO|UNIDAD)\s*\d*[:\s]+(.+)/i, // "Tema 1: ..." etc.
    /^(?:#{1,3}\s+)(.+)/,                        // "# Heading"
  ];

  const temas: string[] = [];
  const contenido_temas: Record<string, string> = {};
  const paginas_temas: Record<string, string> = {};

  // Extract topics and their following content
  let currentTopic: string | null = null;
  let currentContent: string[] = [];

  function flushTopic() {
    if (currentTopic && currentContent.length > 0) {
      const topic = currentTopic.trim();
      if (!temas.includes(topic)) {
        temas.push(topic);
        contenido_temas[topic] = currentContent.join(' ').slice(0, 500);
      }
    }
    currentTopic = null;
    currentContent = [];
  }

  for (const line of lines) {
    let matched = false;

    for (const pattern of topicPatterns) {
      const m = line.match(pattern);
      if (m) {
        flushTopic();
        currentTopic = m[1].trim().slice(0, 100);
        currentContent = [line.replace(pattern, '').trim()];
        matched = true;
        break;
      }
    }

    if (!matched && currentTopic) {
      // Append to current topic's content (up to 200 chars)
      if (currentContent.join(' ').length < 300) {
        currentContent.push(line);
      }
    }

    // Detect page ranges: "pp. 24-29" or "p. 34"
    const pageMatch = line.match(/pp?\.\s*(\d+[\-–]\d+|\d+)/);
    if (pageMatch && currentTopic) {
      const range = pageMatch[1];
      if (!paginas_temas[currentTopic]) {
        paginas_temas[currentTopic] = `pp. ${range}`;
      }
    }
  }
  flushTopic();

  // ── 3. Quality gate: if too many low-quality topics detected (OCR noise), fall back ──
  const avgContentLen = temas.length > 0
    ? Object.values(contenido_temas).reduce((sum, c) => sum + c.length, 0) / temas.length
    : 0;

  if (temas.length > 10 || (temas.length > 0 && avgContentLen < 30)) {
    // Too many topics or too little content per topic — OCR noise. Clear and fall back.
    temas.length = 0;
    for (const key of Object.keys(contenido_temas)) delete contenido_temas[key];
    for (const key of Object.keys(paginas_temas)) delete paginas_temas[key];
  }

  // ── 4. Fallback: if no topics detected, create synthetic from content ──
  if (temas.length === 0) {
    // Try to extract unit name from filename: "Unidad 2.pdf" → "Unidad 2"
    const fileMatch = ingest.metadata.fileName.match(/[Uu]nidad\s*(\d+)/i);
    if (fileMatch) {
      unidad_real = 'Unidad ' + fileMatch[1];
    }

    // For OCR/scanned PDFs: don't create fake topics. Let the user define them.
    // Just return the unit name — the UI will show raw text for manual curation.
  }

  return { unidad_real, temas, contenido_temas, paginas_temas };
}

/**
 * Full pipeline: ingest file → extract curriculum → ready for Motor_Alpha-2 output
 */
export async function ingestAndExtract(file: File, grado_nivel?: string): Promise<{
  ingest: IngestResult;
  curriculum: CurriculumResult;
}> {
  const ingest = await ingestDocument(file);
  const curriculum = extractCurriculum(ingest, grado_nivel);
  return { ingest, curriculum };
}

/**
 * AI-powered curriculum extraction using Motor_Alpha-2 prompt + MiniMax M2.7.
 * Sends extracted OCR text to the AI and returns structured curriculum.
 */
export async function extractCurriculumWithAI(
  ingest: IngestResult,
  grado_nivel: string = '5to Primaria',
): Promise<CurriculumResult> {
  if (!ingest.ok || !ingest.fullText || ingest.fullText.length < 10) {
    return { unidad_real: 'Sin datos', temas: [], contenido_temas: {}, paginas_temas: {} };
  }

  try {
    const userMessage = [
      'grado_nivel: ' + grado_nivel,
      '',
      'TEXTO EXTRAIDO DEL DOCUMENTO:',
      ingest.fullText.slice(0, 8000), // limit to 8K chars for API
      '',
      'Extrae la unidad, TODOS los temas, contenido de cada tema (del texto proporcionado), y paginas si las hay.',
      'Responde SOLO con JSON valido, sin explicaciones ni markdown.',
    ].join('\n');

    const result = await callMinimax(alpha2Prompt, userMessage, {
      temperature: 0.3,
      maxTokens: 4096,
      jsonMode: true,
    });

    if (!result.ok) {
      console.warn('AI extraction failed:', result.error, '— falling back to regex');
      return extractCurriculum(ingest, grado_nivel);
    }

    try {
      const parsed = JSON.parse(result.text);
      return {
        unidad_real: parsed.unidad_real || 'Unidad sin nombre',
        temas: Array.isArray(parsed.temas) ? parsed.temas : [],
        contenido_temas: parsed.contenido_temas || {},
        paginas_temas: parsed.paginas_temas || {},
      };
    } catch {
      console.warn('AI returned invalid JSON, falling back to regex');
      return extractCurriculum(ingest, grado_nivel);
    }
  } catch (err) {
    console.warn('AI extraction error:', err, '— falling back to regex');
    return extractCurriculum(ingest, grado_nivel);
  }
}