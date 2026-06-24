import { createContext, useContext, useState, useCallback, useId, type ReactNode } from 'react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// useId generates unique IDs per render — safe in concurrent mode + StrictMode
let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const baseId = useId(); // stable per component instance

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // prefix with baseId (stable) + counter (unique per call) to avoid collisions
    const id = `${baseId}-${++toastIdCounter}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, [baseId]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string; role: string }> = {
    success: { bg: '#f0fdf4', border: '#3A9E5E', icon: '✅', role: 'status' },
    error: { bg: '#fef2f2', border: '#ef4444', icon: '❌', role: 'alert' },
    info: { bg: '#eff6ff', border: '#5c6ac4', icon: 'ℹ️', role: 'status' },
    warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️', role: 'status' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        className={styles.container}
        role="region"
        aria-label="Notificaciones"
        aria-live="polite"
      >
        {toasts.map(toast => {
          const colors = TOAST_COLORS[toast.type];
          return (
            <div
              key={toast.id}
              role={colors.role}
              aria-atomic="true"
              className={styles.toast}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
              }}
            >
              <span className={styles.icon} aria-hidden="true">{colors.icon}</span>
              <span className={styles.message}>{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className={styles.closeBtn}
                aria-label="Cerrar notificación"
              >
                ✕
              </button>
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
