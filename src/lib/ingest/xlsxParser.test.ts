import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestXlsx } from './xlsxParser';
import { parseZip, extractTextFromXml } from './zipParser';

// Mock zipParser
vi.mock('./zipParser', () => ({
  parseZip: vi.fn(),
  extractTextFromXml: vi.fn(),
}));

describe('xlsxParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses first sheet from XLSX file', async () => {
    const mockFile = new File(['content'], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    (parseZip as any).mockResolvedValue({
      'xl/worksheets/sheet1.xml': '<row><c><v>Cell A1</v></c><c><v>Cell B1</v></c></row><row><c><v>Cell A2</v></c><c><v>Cell B2</v></c></row>',
    });
    (extractTextFromXml as any).mockReturnValue('Cell A1\tCell B1\nCell A2\tCell B2');

    const result = await ingestXlsx(mockFile);

    expect(result.texts).toBeInstanceOf(Array);
    expect(result.texts[0].text).toContain('XLSX');
    expect(result.tables.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBe(1); // PARTIAL_CONTENT warning
  });

  it('handles missing sheet gracefully', async () => {
    const mockFile = new File(['content'], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    (parseZip as any).mockResolvedValue({});
    (extractTextFromXml as any).mockReturnValue('');

    const result = await ingestXlsx(mockFile);

    expect(result.texts).toBeInstanceOf(Array);
    expect(result.tables.length).toBe(0);
  });

  it('returns PARTIAL_CONTENT warning', async () => {
    const mockFile = new File(['content'], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    (parseZip as any).mockResolvedValue({
      'xl/worksheets/sheet1.xml': '<row><c><v>Data</v></c></row>',
    });
    (extractTextFromXml as any).mockReturnValue('Data');

    const result = await ingestXlsx(mockFile);

    expect(result.warnings.some((w: any) => w.code === 'PARTIAL_CONTENT')).toBe(true);
  });
});
