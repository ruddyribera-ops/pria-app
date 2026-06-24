/**
 * InlineText — click-to-edit text component.
 * Click on any text to edit it inline. Enter / blur saves, Escape cancels.
 * Long text (>60 chars) opens as a textarea.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface InlineTextProps {
  id: string;
  value: string;
  onChange: (id: string, val: string) => void;
  style?: React.CSSProperties;
  disabled?: boolean;
  accentColor?: string;
  multiline?: boolean;
}

export default function InlineText({
  id, value, onChange, style, disabled, accentColor = '#3A9E5E', multiline,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const handleStart = useCallback(() => {
    if (disabled) return;
    setEditing(true);
    setLocal(value);
  }, [disabled, value]);

  const handleFinish = useCallback(() => {
    setEditing(false);
    if (local !== value && local.trim()) {
      onChange(id, local);
    }
  }, [id, local, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      (e.target as HTMLElement).blur();
    }
    if (e.key === 'Escape') {
      setLocal(value);
      (e.target as HTMLElement).blur();
    }
  }, [value]);

if (editing) {
    const isLong = (local?.length ?? 0) > 60 || multiline;

    return isLong ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleFinish}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleFinish}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={handleStart}
      style={{
        ...style,
        cursor: disabled ? 'default' : 'pointer',
        borderBottom: disabled ? 'none' : '2px solid transparent',
        transition: 'border-color 0.15s',
        borderRadius: 2,
      }}
      title={disabled ? undefined : 'Click para editar'}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.borderBottomColor = accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderBottomColor = 'transparent';
      }}
    >
      {value || <span style={{ color: '#ccc', fontStyle: 'italic' }}>Click para editar...</span>}
    </span>
  );
}
