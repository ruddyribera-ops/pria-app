/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function ToastTestHelper() {
  const { showToast } = useToast();

  return (
    <div>
      <button type="button" onClick={() => showToast('Hello')}>Show Toast</button>
      <button type="button" onClick={() => showToast('Error msg', 'error')}>Show Error</button>
      <button type="button" onClick={() => showToast('One', 'info')}>Show One</button>
      <button type="button" onClick={() => showToast('Two', 'info')}>Show Two</button>
    </div>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('showToast shows toast', () => {
    render(
      <ToastProvider>
        <ToastTestHelper />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Show Toast/i }));

    expect(screen.getByText('Hello')).toBeTruthy();
  });

  test('Toast auto-dismisses after 4 seconds', () => {
    render(
      <ToastProvider>
        <ToastTestHelper />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Show Toast/i }));
    expect(screen.getByText('Hello')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Hello')).toBeNull();
  });

  test('Toast type="error" shows error styling', () => {
    render(
      <ToastProvider>
        <ToastTestHelper />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Show Error/i }));

    const toast = screen.getByRole('alert');
    expect(toast).toBeTruthy();
    // Browser returns rgb() format - normalize to check the color
    const bgColor = toast.style.background;
    expect(bgColor).toMatch(/rgb\(254,\s*242,\s*242\)|#fef2f2/i);
    expect(toast.style.border).toMatch(/rgb\(239,\s*68,\s*68\)|#ef4444/i);
  });

  test('Multiple toasts stack correctly', () => {
    render(
      <ToastProvider>
        <ToastTestHelper />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Show One/i }));
    fireEvent.click(screen.getByRole('button', { name: /Show Two/i }));

    expect(screen.getByText('One')).toBeTruthy();
    expect(screen.getByText('Two')).toBeTruthy();
  });
});
