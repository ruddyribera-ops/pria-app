// All exported types for the ingest system

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
  pageUrl?: string;
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
  type: string;
  embedded: boolean;
  imageDataUrl?: string;
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
  ok: boolean;
  texts: PageContent[];
  fullText: string;
  metadata: IngestMetadata;
  tables: string[][];
  images: string[];
  warnings: IngestWarning[];
  error?: string;
}

export interface CurriculumResult {
  unidad_real: string;
  temas: string[];
  contenido_temas: Record<string, string>;
  paginas_temas: Record<string, string>;
}
