import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export default function Button({ variant = 'primary', size = 'md', children, className = '', style, ...props }: ButtonProps) {
  const base: Record<string, React.CSSProperties> = {
    primary: {
      background: '#3A9E5E',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      fontWeight: 500,
    },
    secondary: {
      background: '#fff',
      color: '#6b6b80',
      border: '1px solid #e6e6eb',
      borderRadius: '4px',
      fontWeight: 500,
    },
    danger: {
      background: '#ef4444',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      fontWeight: 500,
    },
    ghost: {
      background: 'none',
      color: '#6b6b80',
      border: 'none',
      borderRadius: '4px',
      fontWeight: 500,
    },
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
    md: { padding: '0.5rem 1rem', fontSize: '0.8125rem' },
  };

  return (
    <button
      className={className}
      style={{ cursor: 'pointer', transition: 'all .15s', ...base[variant], ...sizes[size], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
