import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: '#f0fdf4', border: '#3A9E5E', icon: '✅' },
    error: { bg: '#fef2f2', border: '#ef4444', icon: '❌' },
    info: { bg: '#eff6ff', border: '#5c6ac4', icon: 'ℹ️' },
    warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px',
      }}>
        {toasts.map(toast => {
          const colors = TOAST_COLORS[toast.type];
          return (
            <div key={toast.id} style={{
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: '8px', padding: '0.75rem 1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.8125rem', color: '#1e1e2f',
              animation: 'slideIn 0.3s ease',
            }}>
              <span>{colors.icon}</span>
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} style={{
                background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer',
                color: '#6b6b80', padding: '0', lineHeight: 1,
              }}>✕</button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
