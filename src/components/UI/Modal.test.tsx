/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  test('Renders when isOpen=true', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Test Modal">Content</Modal>);
    expect(screen.getByRole('dialog', { name: /Test Modal/i })).toBeTruthy();
  });

  test('Does not render when isOpen=false', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Test Modal">Content</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('Backdrop click calls onClose', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test Modal">Content</Modal>);

    const backdrop = screen.getByRole('dialog').parentElement!;
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('Escape key calls onClose', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test Modal">Content</Modal>);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('Backdrop click with no-op onClose does not throw', () => {
    // When onClose is a no-op, clicking backdrop should not crash
    render(<Modal isOpen={true} onClose={() => {}} title="Test Modal">Content</Modal>);
    const backdrop = screen.getByRole('dialog').parentElement!;
    expect(() => fireEvent.click(backdrop)).not.toThrow();
  });
});
