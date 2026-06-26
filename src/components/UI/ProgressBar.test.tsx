/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  test('Renders with 0% (empty bar)', () => {
    render(<ProgressBar current={0} total={10} />);
    expect(screen.getByText('Día 0/10')).toBeTruthy();
    const fill = document.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  test('Renders with 50% (half full)', () => {
    render(<ProgressBar current={5} total={10} />);
    expect(screen.getByText('Día 5/10')).toBeTruthy();
    const fill = document.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  test('Renders with 100% (full)', () => {
    render(<ProgressBar current={10} total={10} />);
    expect(screen.getByText('Día 10/10')).toBeTruthy();
    const fill = document.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  test('value prop > 100 is clamped to 100', () => {
    render(<ProgressBar current={15} total={10} />);
    const fill = document.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});
