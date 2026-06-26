/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import LoadingSkeleton from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  test('Renders skeleton element', () => {
    render(<LoadingSkeleton type="text" />);
    // Should render div elements with animation (pulse class applied via inline styles)
    const skeletonDivs = document.querySelectorAll('div');
    expect(skeletonDivs.length).toBeGreaterThan(0);
  });

  test('count prop renders multiple skeletons', () => {
    render(<LoadingSkeleton type="text" rows={3} />);
    const skeletonDivs = document.querySelectorAll('div[style*="pulse"]');
    expect(skeletonDivs.length).toBe(3);
  });

  test('table type renders correct structure', () => {
    render(<LoadingSkeleton type="table" rows={2} />);
    // Outer wrapper has border-radius style
    const outerDiv = document.querySelector('div[style*="border-radius"]');
    expect(outerDiv).toBeTruthy();
    // Should render rows with flex layout (2 rows for rows=2)
    const flexDivs = document.querySelectorAll('div[style*="flex"]');
    expect(flexDivs.length).toBeGreaterThanOrEqual(2);
  });

  test('card type renders correct structure', () => {
    render(<LoadingSkeleton type="card" />);
    // Should have a grid container
    const cards = document.querySelectorAll('div[style*="grid"]');
    expect(cards.length).toBe(1);
  });
});
