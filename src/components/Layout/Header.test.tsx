/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from './Header';

describe('Header', () => {
  test('renders title', () => {
    render(<Header title="Test Title" subtitle="Test Subtitle" />);
    expect(screen.getByText('Test Title')).toBeTruthy();
  });

  test('renders subtitle', () => {
    render(<Header title="Test Title" subtitle="Test Subtitle" />);
    expect(screen.getByText('Test Subtitle')).toBeTruthy();
  });

  test('renders different titles', () => {
    render(<Header title="Another Title" subtitle="Another Subtitle" />);
    expect(screen.getByText('Another Title')).toBeTruthy();
    expect(screen.getByText('Another Subtitle')).toBeTruthy();
  });

  test('has correct heading structure', () => {
    render(<Header title="Page Title" subtitle="Page Subtitle" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe('Page Title');
  });
});
