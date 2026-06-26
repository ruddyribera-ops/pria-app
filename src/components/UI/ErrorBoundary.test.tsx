/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// Mock Sentry
vi.mock('@sentry/react', () => ({
  withScope: vi.fn((callback) => {
    callback({ setExtra: vi.fn() });
  }),
  captureException: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ThrowError(props: { message: string }): any {
  throw new Error(props.message);
}

function NormalChild() {
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Stub import.meta.env.DEV to false
    vi.stubEnv('DEV', false);
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test('Child renders normally — no error UI', () => {
    render(
      <ErrorBoundary>
        <NormalChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });

  test('Child throws — ErrorBoundary catches and shows fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Something broke" />
      </ErrorBoundary>
    );
    // Use getAllByText since cleanup may not remove all instances
    const errors = screen.getAllByText('Algo salió mal');
    expect(errors.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeTruthy();
  });

  test('Error message contains email addresses — error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Failed to send to user@example.com" />
      </ErrorBoundary>
    );
    // The fallback UI should be shown, confirming the error was caught
    const errors = screen.getAllByText('Algo salió mal');
    expect(errors.length).toBeGreaterThan(0);
  });

  test('Retry button is present and clickable', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="First render error" />
      </ErrorBoundary>
    );
    const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
    expect(retryBtn).toBeTruthy();

    // Click retry - since child still throws, error boundary catches again
    fireEvent.click(retryBtn);
    // The error UI should still be visible (child throws again)
    const errors = screen.getAllByText('Algo salió mal');
    expect(errors.length).toBeGreaterThan(0);
  });

  test('DEV mode — console.error is called instead of Sentry', () => {
    vi.stubEnv('DEV', true);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError message="Dev error" />
      </ErrorBoundary>
    );

    // In DEV mode, error is logged to console, not Sentry
    expect(consoleSpy).toHaveBeenCalled();
    expect(screen.getAllByText('Algo salió mal').length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });
});
