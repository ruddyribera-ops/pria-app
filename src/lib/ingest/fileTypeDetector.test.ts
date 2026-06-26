import { describe, it, expect } from 'vitest';
import { detectFileType } from './fileTypeDetector';

describe('fileTypeDetector', () => {
  describe('detects by extension and MIME type', () => {
    it('detects PDF', () => {
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      expect(detectFileType(file)).toBe('pdf');
    });

    it('detects DOCX by MIME', () => {
      const file = new File(['content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      expect(detectFileType(file)).toBe('docx');
    });

    it('detects DOCX by extension', () => {
      const file = new File(['content'], 'document.docx', { type: 'application/octet-stream' });
      expect(detectFileType(file)).toBe('docx');
    });

    it('detects XLSX by MIME', () => {
      const file = new File(['content'], 'spreadsheet.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      expect(detectFileType(file)).toBe('xlsx');
    });

    it('detects XLSX by extension', () => {
      const file = new File(['content'], 'spreadsheet.xlsx', { type: 'text/plain' });
      expect(detectFileType(file)).toBe('xlsx');
    });

    it('detects PPTX by MIME', () => {
      const file = new File(['content'], 'presentation.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      expect(detectFileType(file)).toBe('pptx');
    });

    it('detects PPTX by extension', () => {
      const file = new File(['content'], 'presentation.pptx', { type: 'application/octet-stream' });
      expect(detectFileType(file)).toBe('pptx');
    });

    it('detects image by MIME', () => {
      const file = new File(['content'], 'image.png', { type: 'image/png' });
      expect(detectFileType(file)).toBe('image');
    });

    it('detects image by extension', () => {
      const file = new File(['content'], 'image.jpg', { type: 'application/octet-stream' });
      expect(detectFileType(file)).toBe('image');
    });

    it('detects text by MIME', () => {
      const file = new File(['content'], 'readme.txt', { type: 'text/plain' });
      expect(detectFileType(file)).toBe('text');
    });

    it('detects text by extension', () => {
      const file = new File(['content'], 'readme.txt', { type: 'application/octet-stream' });
      expect(detectFileType(file)).toBe('text');
    });

    it('detects HTML by MIME', () => {
      const file = new File(['<html></html>'], 'page.html', { type: 'text/html' });
      expect(detectFileType(file)).toBe('html');
    });

    it('returns text for text/plain MIME even with html extension', () => {
      // Source checks MIME first, so text/plain returns 'text' regardless of .html extension
      const file = new File(['<html></html>'], 'page.html', { type: 'text/plain' });
      expect(detectFileType(file)).toBe('text');
    });

    it('returns unknown for unrecognized types', () => {
      const file = new File(['content'], 'weird.xyz', { type: 'application/octet-stream' });
      expect(detectFileType(file)).toBe('unknown');
    });

    it('is case insensitive for extensions', () => {
      const file = new File(['content'], 'document.PDF', { type: 'application/octet-stream' });
      expect(detectFileType(file)).toBe('pdf');
    });
  });
});
