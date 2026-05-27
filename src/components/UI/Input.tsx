import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, style, ...props }: InputProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && (
        <label style={{
          display: 'block', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600,
          color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem',
        }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%', padding: '0.75rem 1rem', border: '1px solid #d4d4e0',
          borderRadius: '4px', fontSize: '0.875rem', outline: 'none',
          background: '#f8f8ff', transition: 'border .2s, box-shadow .2s',
          boxSizing: 'border-box', ...style,
        }}
        {...props}
      />
    </div>
  );
}
