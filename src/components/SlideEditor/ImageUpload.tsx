/**
 * ImageUpload — file input that converts uploaded images to base64 data URLs.
 */

import { useRef, useCallback } from 'react';

interface ImageUploadProps {
  elementId: string;
  currentDataUrl?: string;
  onImage: (elementId: string, dataUrl: string) => void;
  disabled?: boolean;
}

export default function ImageUpload({ elementId, currentDataUrl, onImage, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes (PNG, JPG, GIF, WebP)');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onImage(elementId, dataUrl);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-uploaded
    e.target.value = '';
  }, [elementId, onImage]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onImage(elementId, '');
  }, [elementId, onImage]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleFile}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {currentDataUrl ? (
        <div
          onClick={handleClick}
          style={{
            position: 'relative',
            cursor: disabled ? 'default' : 'pointer',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '2px dashed #d4d4e0',
            background: '#f8f8ff',
          }}
        >
          <img
            src={currentDataUrl}
            alt="Slide image"
            style={{
              width: '100%',
              maxHeight: '140px',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            fontSize: '0.625rem', padding: '0.25rem 0.5rem',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Click para cambiar</span>
            <span
              onClick={handleRemove}
              style={{ cursor: 'pointer', fontWeight: 600 }}
            >
              ✕ Eliminar
            </span>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          style={{
            padding: '1.5rem 1rem',
            border: '2px dashed #d4d4e0',
            borderRadius: '4px',
            textAlign: 'center',
            cursor: disabled ? 'default' : 'pointer',
            background: '#fafafe',
            color: '#9e9eb0',
            fontSize: '0.7rem',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = '#3A9E5E';
              e.currentTarget.style.background = '#f0fdf4';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d4d4e0';
            e.currentTarget.style.background = '#fafafe';
          }}
        >
          🖼️ Click para agregar imagen
          <div style={{ fontSize: '0.6rem', marginTop: '0.25rem', color: '#b0b0c4' }}>
            PNG, JPG, GIF · Máx 5MB
          </div>
        </div>
      )}
    </div>
  );
}
