/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminUsuariosPanel from '../../AdminUsuariosPanel';

describe('AdminUsuariosPanel', () => {
  it('renders usuarios table heading', () => {
    render(<AdminUsuariosPanel showToast={() => {}} />);
    expect(screen.getByText('NOMBRE')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<AdminUsuariosPanel showToast={() => {}} />);
    expect(screen.getByRole('button', { name: /guardar usuario/i })).toBeInTheDocument();
  });
});
