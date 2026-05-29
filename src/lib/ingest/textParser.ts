import type { PageContent, IngestWarning } from './types';

export async function ingestText(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[] }> {
  const warnings: IngestWarning[] = [];
  const text = await file.text();
  const paragraphs = text.split(/\n{2,}/).filter(s => s.trim().length > 0);
  const texts = paragraphs.map((p, i) => ({ pageNumber: i + 1, text: p.trim() }));
  return { texts, warnings };
}

export async function ingestHtml(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[] }> {
  const warnings: IngestWarning[] = [];
  const html = await file.text();
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
  const texts = paragraphs.map((p, i) => ({ pageNumber: i + 1, text: p.trim() }));
  return { texts, warnings };
}
