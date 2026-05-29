import type { FileType } from './types';

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
