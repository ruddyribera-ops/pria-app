import { parseZip, extractTextFromXml } from './zipParser';
import type { PageContent, IngestWarning } from './types';

export async function ingestXlsx(file: File): Promise<{ texts: PageContent[]; warnings: IngestWarning[]; tables: string[][] }> {
  const warnings: IngestWarning[] = [
    { code: 'PARTIAL_CONTENT', message: 'XLSX support extracts first sheet as CSV-like text' },
  ];
  const tables: string[][] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await parseZip(arrayBuffer);
    const sheetKey = Object.keys(zip).find(k => k.match(/xl\/worksheets\/sheet1\.xml/));
    if (sheetKey) {
      const sheetXml = zip[sheetKey];
      const text = extractTextFromXml(sheetXml);
      const rows = text.split(/\r?\n/).filter(r => r.trim());
      tables.push(...rows.map(r => r.split(/\t/)));
    }
  } catch {
    // ignore
  }

  return { texts: [{ pageNumber: 1, text: `[XLSX] ${tables.length} rows extracted` }], warnings, tables };
}
