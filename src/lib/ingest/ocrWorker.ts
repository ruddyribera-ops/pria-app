import { fileToDataUrl } from './zipParser';
import type { PageContent, IngestWarning } from './types';

export async function ingestImage(
  file: File,
  onProgress?: (stage: string, percent: number) => void,
): Promise<{ texts: PageContent[]; warnings: IngestWarning[]; images: string[] }> {
  const warnings: IngestWarning[] = [];
  const texts: PageContent[] = [];
  const images: string[] = [];

  const dataUrl = await fileToDataUrl(file);
  images.push(dataUrl);

  // Spawn a dedicated worker for this image — avoids shared worker state issues
  const worker = new Worker(new URL('./ocr.worker.ts', import.meta.url), { type: 'module' });

  try {
    if (onProgress) onProgress('Ejecutando OCR...', 20);

    const result = await new Promise<{ text: string; confidence: number }>((resolve, reject) => {
      worker.onmessage = (event) => {
        const { type, status, progress, text, confidence, error } = event.data;

        if (type === 'progress') {
          // status is like 'loading tesseract', 'recognizing text', etc.
          // Map to OCR-specific stage for onProgress callback
          if (status === 'recognizing text' && onProgress) {
            onProgress('OCR pagina...', Math.round(progress * 100));
          }
        } else if (type === 'done') {
          resolve({ text, confidence });
        } else if (type === 'error') {
          reject(new Error(error));
        }
      };

      worker.onerror = (err) => {
        reject(new Error(err.message ?? 'Worker error'));
      };

      // Kick off OCR on the worker thread
      worker.postMessage({ imageDataUrl: dataUrl, lang: 'eng+spa', taskId: Date.now() });
    });

    const ocrText = result.text;
    texts.push({ pageNumber: 1, text: ocrText });

    if (result.confidence < 70) {
      warnings.push({ code: 'IMAGE_QUALITY_LOW', message: `OCR confidence only ${Math.round(result.confidence)}% — results may contain errors` });
    }
  } catch (err) {
    warnings.push({ code: 'OCR_USED', message: `OCR failed: ${err}` });
    texts.push({ pageNumber: 1, text: '' });
  } finally {
    worker.terminate();
  }

  return { texts, warnings, images };
}