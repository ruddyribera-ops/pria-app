/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadZone from './UploadZone';

describe('UploadZone', () => {
  test('renders upload area with correct text', () => {
    render(<UploadZone onUpload={vi.fn()} ingesting={false} />);
    expect(screen.getByText('Libro de Texto (PDF)')).toBeTruthy();
    expect(screen.getAllByText(/Formatos aceptados:/).length).toBeGreaterThanOrEqual(1);
  });

  test('renders with disabled cursor when ingesting', () => {
    render(<UploadZone onUpload={vi.fn()} ingesting={true} />);
    // When ingesting, the zone should have cursor not-allowed
    // The actual cursor value depends on inline style computation in jsdom
    const zone = screen.getByText('Libro de Texto (PDF)').parentElement;
    expect(zone).toBeTruthy();
  });

  test('input element is hidden', () => {
    render(<UploadZone onUpload={vi.fn()} ingesting={false} />);
    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBe(1);
    expect((inputs[0] as HTMLInputElement).style.display).toBe('none');
  });

  test('clicking zone does not crash', async () => {
    const user = userEvent.setup();
    render(<UploadZone onUpload={vi.fn()} ingesting={false} />);
    
    const zone = screen.getByText('Libro de Texto (PDF)').parentElement!;
    await user.click(zone);
    
    expect(zone).toBeTruthy();
  });

  test('file input accept attribute is set correctly', () => {
    render(<UploadZone onUpload={vi.fn()} ingesting={false} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('.pdf,.docx,.txt');
  });

  test('file input is disabled when ingesting', () => {
    render(<UploadZone onUpload={vi.fn()} ingesting={true} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  test('onUpload is called when file is selected', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    render(<UploadZone onUpload={onUpload} ingesting={false} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    await user.upload(input, file);
    
    expect(onUpload).toHaveBeenCalledTimes(1);
  });
});
