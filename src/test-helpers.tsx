/** @vitest-environment jsdom */
import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from './components/UI/Toast';

// ─── QueryClient ─────────────────────────────────────────────────────────────

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ─── AllProviders (wraps with ToastProvider + QueryClientProvider + MemoryRouter) ──

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

export function AllProviders({
  children,
  queryClient,
  initialEntries = ['/'],
}: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── renderWithProviders ──────────────────────────────────────────────────────

export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions & {
    queryClient?: QueryClient;
    initialEntries?: string[];
  } = {}
) {
  const {
    queryClient: qc,
    initialEntries: entries = ['/'],
    ...rest
  } = options;

  return render(
    ui,
    {
      wrapper: ({ children: c }: { children: ReactNode }) => (
        <AllProviders queryClient={qc} initialEntries={entries}>
          {c}
        </AllProviders>
      ),
      ...rest,
    }
  );
}
