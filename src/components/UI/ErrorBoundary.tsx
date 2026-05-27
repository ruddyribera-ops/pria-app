import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.pageName || 'unknown'}]`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '3rem 2rem', textAlign: 'center', minHeight: '300px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', background: '#fef2f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', marginBottom: '1rem',
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f', margin: '0 0 0.375rem' }}>
            Algo salió mal
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b6b80', margin: '0 0 1.25rem', maxWidth: '400px' }}>
            {this.props.pageName
              ? `Ocurrió un error en la página "${this.props.pageName}".`
              : 'Ocurrió un error inesperado.'}
            {' '}Puedes reintentar o volver al inicio.
          </p>
          {this.state.error && (
            <details style={{ marginBottom: '1.25rem', maxWidth: '500px', textAlign: 'left' }}>
              <summary style={{ fontSize: '0.75rem', color: '#6b6b80', cursor: 'pointer' }}>
                Ver detalle técnico
              </summary>
              <pre style={{
                fontSize: '0.6875rem', margin: '0.5rem 0 0', whiteSpace: 'pre-wrap',
                wordBreak: 'break-word', background: '#f8f8ff', padding: '0.75rem',
                borderRadius: '4px', color: '#ef4444', maxHeight: '150px', overflow: 'auto',
              }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.5rem 1.25rem', background: '#3A9E5E', color: '#fff',
                border: 'none', borderRadius: '4px', fontWeight: 500, fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              🔄 Reintentar
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.5rem 1.25rem', background: '#fff', color: '#6b6b80',
                border: '1px solid #e6e6eb', borderRadius: '4px', fontWeight: 500,
                fontSize: '0.8125rem', cursor: 'pointer',
              }}
            >
              🏠 Ir al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
