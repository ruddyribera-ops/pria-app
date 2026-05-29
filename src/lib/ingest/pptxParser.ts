import { parseZip, extractTextFromXml } from './zipParser';
import type { PageContent, IngestWarning } from './types';

export async function ingestPptx(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[] }> {
  const warnings: IngestWarning[] = [
    { code: 'PARTIAL_CONTENT', message: 'PPTX support is basic — extracts text only, no slides/charts' },
  ];
  const texts: PageContent[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await parseZip(arrayBuffer);
    const slideTexts: string[] = [];
    const slideKeys = Object.keys(zip).filter(k => k.match(/ppt\/slides\/slide\d+\.xml/)).sort();

    if (slideKeys.length === 0) {
      return { texts: [{ pageNumber: 1, text: '[PPTX] No slides found in file' }], warnings };
    }

    for (const key of slideKeys) {
      const slideText = extractTextFromXml(zip[key]);
      if (slideText.trim()) slideTexts.push(slideText.trim());
    }

    texts.push(...slideTexts.map((t, i) => ({ pageNumber: i + 1, text: t })));
  } catch {
    texts.push({ pageNumber: 1, text: '[PPTX] Could not parse — file may be corrupted or password-protected' });
  }

  return { texts, warnings };
}
