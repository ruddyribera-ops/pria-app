/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileList from './FileList';
import type { Material } from '../../types';

describe('FileList', () => {
  test('renders empty state when no files', () => {
    render(<FileList materials={[]} loading={false} onDelete={vi.fn()} />);
    expect(screen.getByText('No hay materiales subidos')).toBeTruthy();
    expect(screen.getByText('Sube tu primer PDF para comenzar')).toBeTruthy();
  });

  test('renders empty folder emoji in empty state', () => {
    render(<FileList materials={[]} loading={false} onDelete={vi.fn()} />);
    expect(screen.getByText('📂')).toBeTruthy();
  });

  test('renders loading state', () => {
    render(<FileList materials={[]} loading={true} onDelete={vi.fn()} />);
    expect(screen.getByText('Cargando materiales...')).toBeTruthy();
  });

  test('renders list of files with names', () => {
    const materials: Material[] = [
      { id: 1, filename: 'test.pdf', tipo: 'application/pdf', size: 1024 },
      { id: 2, filename: 'doc.docx', tipo: 'application/docx', size: 2048 },
    ];
    render(<FileList materials={materials} loading={false} onDelete={vi.fn()} />);
    expect(screen.getByText('test.pdf')).toBeTruthy();
    expect(screen.getByText('doc.docx')).toBeTruthy();
  });

  test('renders file size when available', () => {
    const materials: Material[] = [
      { id: 1, filename: 'test.pdf', tipo: 'application/pdf', size: 1024 },
    ];
    render(<FileList materials={materials} loading={false} onDelete={vi.fn()} />);
    // formatFileSize(1024) = '1.0 KB'
    expect(screen.getByText(/1\.0 KB/)).toBeTruthy();
  });

  test('delete button calls onDelete with correct id', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const materials: Material[] = [
      { id: 42, filename: 'test.pdf', tipo: 'application/pdf' },
    ];
    render(<FileList materials={materials} loading={false} onDelete={onDelete} />);
    
    const deleteBtn = screen.getByRole('button', { name: /✕/ });
    await user.click(deleteBtn);
    
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(42);
  });

  test('renders multiple delete buttons for multiple files', () => {
    const materials: Material[] = [
      { id: 1, filename: 'test1.pdf', tipo: 'application/pdf' },
      { id: 2, filename: 'test2.pdf', tipo: 'application/pdf' },
    ];
    render(<FileList materials={materials} loading={false} onDelete={vi.fn()} />);
    const deleteButtons = screen.getAllByRole('button', { name: /✕/ });
    expect(deleteButtons.length).toBe(2);
  });
});
