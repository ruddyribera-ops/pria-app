/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  test('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /Click me/i })).toBeTruthy();
  });

  test('renders default variant="primary" styling', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button', { name: /Primary/i });
    expect(btn).toHaveStyle({ background: '#3A9E5E', color: '#fff' });
  });

  test('renders variant="danger" styling', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button', { name: /Delete/i });
    expect(btn).toHaveStyle({ background: '#ef4444', color: '#fff' });
  });

  test('renders variant="secondary" styling', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button', { name: /Cancel/i });
    expect(btn).toHaveStyle({ background: '#fff', color: '#6b6b80' });
  });

  test('disabled prop disables the button', () => {
    render(<Button disabled>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  test('Click handler fires when not disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('Click handler does NOT fire when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('renders variant="ghost" styling', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button', { name: /Ghost/i });
    expect(btn).toHaveStyle({ background: 'none', color: '#6b6b80' });
  });
});
