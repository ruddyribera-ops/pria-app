/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImageUpload from './ImageUpload';

describe('ImageUpload', () => {
  test('renders upload placeholder when no image', () => {
    render(<ImageUpload elementId="test" onImage={vi.fn()} />);
    expect(screen.getByText(/Click para agregar imagen/)).toBeTruthy();
  });

  test('renders image preview when dataUrl is provided', () => {
    render(
      <ImageUpload
        elementId="test"
        currentDataUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        onImage={vi.fn()}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect(screen.getByText(/Click para cambiar/)).toBeTruthy();
  });

  test('shows remove button when image exists', () => {
    render(
      <ImageUpload
        elementId="test"
        currentDataUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        onImage={vi.fn()}
      />
    );
    expect(screen.getByText(/Eliminar/)).toBeTruthy();
  });
});
