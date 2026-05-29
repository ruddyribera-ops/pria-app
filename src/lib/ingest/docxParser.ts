import mammoth from 'mammoth';
import { parseZip, extractTextFromXml } from './zipParser';
import type { PageContent, IngestWarning, TableData, ImageData, ChartData, HeaderFooterContent, FootnoteItem } from './types';

export async function ingestDocx(file: File): Promise<{
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

  // Step 1: Extract raw text
  const rawResult = await mammoth.extractRawText({ arrayBuffer });
  const fullText = rawResult.value;
  if (rawResult.messages.length > 0) {
    warnings.push({ code: 'PARTIAL_CONTENT', message: `DOCX parse had ${rawResult.messages.length} warning(s): ${rawResult.messages.map(m => m.message).join('; ')}` });
  }
  const sections = fullText.split(/\n\n+/).filter(s => s.trim().length > 0);
  const texts = sections.map((text, i) => ({ pageNumber: i + 1, text: text.trim() }));
  if (texts.length === 1 && fullText.length > 500) {
    const paragraphs = fullText.split(/\n/).filter(s => s.trim().length > 20);
    texts.length = 0;
    paragraphs.forEach((p, i) => texts.push({ pageNumber: i + 1, text: p.trim() }));
  }

  // Step 2: Extract tables + images via HTML conversion
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value;
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[0];
      const headers: string[] = [];
      const rows: string[][] = [];
      const thMatches = tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi);
      for (const m of thMatches) headers.push(m[1].replace(/<[^>]+>/g, '').trim());
      const trMatches = tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      for (const rowMatch of trMatches) {
        const rowHtml = rowMatch[1];
        const tdMatches = rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        const row: string[] = [];
        for (const m of tdMatches) row.push(m[1].replace(/<[^>]+>/g, '').trim());
        if (row.length > 0) rows.push(row);
      }
      if (rows.length > 0) tables.push({ headers: headers.length > 0 ? headers : [], rows });
    }
  } catch {
    warnings.push({ code: 'PARTIAL_CONTENT', message: 'Could not extract tables from DOCX' });
  }

  // Step 3: Extract images from word/media/
  try {
    const zip = await parseZip(arrayBuffer);
    const mediaKeys = Object.keys(zip).filter(k => k.match(/word\/media\//));
    for (const key of mediaKeys) {
      const filename = key.split('/').pop() ?? key;
      const raw = zip[key];
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'png';
      const mimeMap: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml' };
      const mime = mimeMap[ext] ?? 'image/png';
      let dataUrl: string;
      if (raw.startsWith('/9j/') || raw.startsWith('iVBOR')) {
        dataUrl = `data:${mime};base64,${raw}`;
      } else if (raw.charCodeAt(0) === 0x89 && ext === 'png') {
        continue;
      } else {
        dataUrl = `data:${mime};base64,${btoa(raw)}`;
      }
      images.push({ filename, dataUrl });
    }
  } catch {
    // skip image extraction on error
  }

  // Step 4: Extract headers and footers
  try {
    const zip = await parseZip(arrayBuffer);
    const headerKeys = Object.keys(zip).filter(k => k.match(/word\/header\d*\.xml/i)).sort();
    if (headerKeys.length > 0) {
      const headerTexts: string[] = [];
      for (const key of headerKeys) { const text = extractTextFromXml(zip[key]); if (text.trim()) headerTexts.push(text.trim()); }
      if (headerTexts.length > 0) headersFooters.header = headerTexts.join(' | ');
    }
    const footerKeys = Object.keys(zip).filter(k => k.match(/word\/footer\d*\.xml/i)).sort();
    if (footerKeys.length > 0) {
      const footerTexts: string[] = [];
      for (const key of footerKeys) { const text = extractTextFromXml(zip[key]); if (text.trim()) footerTexts.push(text.trim()); }
      if (footerTexts.length > 0) headersFooters.footer = footerTexts.join(' | ');
    }
  } catch {
    // skip headers/footers on error
  }

  // Step 5: Extract footnotes
  try {
    const zip = await parseZip(arrayBuffer);
    const footnoteKey = Object.keys(zip).find(k => k.match(/word\/footnotes\.xml/i));
    if (footnoteKey) {
      const footnoteXml = zip[footnoteKey];
      const footnoteRegex = /<w:footnote[^>]*\sid="(\d+)"[^>]*>([\s\S]*?)<\/w:footnote>/gi;
      let match;
      while ((match = footnoteRegex.exec(footnoteXml)) !== null) {
        const id = parseInt(match[1], 10);
        const footnoteText = extractTextFromXml(match[2]);
        if (footnoteText.trim()) footnotes.push({ id, text: footnoteText.trim() });
      }
    }
  } catch {
    // skip footnotes on error
  }

  // Step 6: Detect charts
  try {
    const zip = await parseZip(arrayBuffer);
    const chartKeys = Object.keys(zip).filter(k => k.match(/word\/charts\//i) || k.match(/xl\/charts\//i));
    for (const key of chartKeys) {
      if (key.endsWith('.xml.rels') || key.endsWith('_rels/') || !key.endsWith('.xml')) continue;
      const chartXml = zip[key];
      let chartType = 'unknown';
      if (chartXml.includes('c:barChart')) chartType = 'bar';
      else if (chartXml.includes('c:lineChart')) chartType = 'line';
      else if (chartXml.includes('c:pieChart')) chartType = 'pie';
      else if (chartXml.includes('c:areaChart')) chartType = 'area';
      charts.push({ title: key.split('/').pop()?.replace('.xml', '') ?? 'Chart', type: chartType, embedded: true });
    }
  } catch {
    // skip charts on error
  }

  return { texts, warnings, tables, images, charts, headersFooters, footnotes };
}
