import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import type { PageContent, IngestWarning } from './types';

export function initPdfWorker(): void {
  // Configure pdfjs worker — called once at module init
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
}

export async function ingestPdf(
  file: File,
  onProgress?: (stage: string, percent: number) => void,
): Promise<{ texts: PageContent[]; warnings: IngestWarning[]; images: string[] }> {
  const warnings: IngestWarning[] = [];
  const texts: PageContent[] = [];
  const images: string[] = [];

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  console.log('[ingestPdf] Loaded PDF with ' + pageCount + ' pages');

  const MAX_PDF_PAGES = 200;
  const pagesToProcess = Math.min(pageCount, MAX_PDF_PAGES);

  if (pageCount > MAX_PDF_PAGES && onProgress) {
    onProgress('PDF tiene ' + pageCount + ' paginas. Procesando primeras ' + pagesToProcess + '...', 0);
    warnings.push({ code: 'PARTIAL_CONTENT', message: 'PDF tiene ' + pageCount + ' paginas. Solo se procesaron las primeras ' + pagesToProcess + ' paginas.' });
  }

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const itemCount = content.items.length;
    console.log('[ingestPdf] Page ' + i + ' has ' + itemCount + ' text items');

    if (onProgress) {
      onProgress('Procesando pagina ' + i + '/' + pagesToProcess + '...', Math.round((i / pagesToProcess) * 90));
    }

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

        const { data } = await Tesseract.recognize(dataUrl, 'eng+spa', {
          logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
              onProgress('OCR pagina ' + i + '...', Math.round(m.progress * 100));
            }
          },
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
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    texts.push({ pageNumber: i, text: pageText });
  }

  return { texts, warnings, images };
}
