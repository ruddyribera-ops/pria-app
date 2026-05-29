import Tesseract from 'tesseract.js';
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

  try {
    if (onProgress) onProgress('Ejecutando OCR...', 20);
    const { data } = await Tesseract.recognize(dataUrl, 'eng+spa', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress('OCR pagina...', Math.round(m.progress * 100));
        }
      },
    });

    const ocrText = data.text;
    texts.push({ pageNumber: 1, text: ocrText });

    if (data.confidence < 70) {
      warnings.push({ code: 'IMAGE_QUALITY_LOW', message: `OCR confidence only ${Math.round(data.confidence)}% — results may contain errors` });
    }
    if (data.blocks && data.blocks.length > 1) {
      warnings.push({ code: 'PARTIAL_CONTENT', message: 'Multiple text blocks detected — content may span columns' });
    }
  } catch (err) {
    warnings.push({ code: 'OCR_USED', message: `OCR failed: ${err}` });
    texts.push({ pageNumber: 1, text: '' });
  }

  return { texts, warnings, images };
}
