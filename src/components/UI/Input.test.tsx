/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from './Input';

describe('Input', () => {
  test('Renders label text', () => {
    render(<Input label="Usuario" />);
    expect(screen.getByText('Usuario')).toBeTruthy();
  });

  test('Renders input with password type', () => {
    render(<Input type="password" />);
    // password inputs don't expose textbox role, query by type attribute
    const inputs = document.querySelectorAll('input[type="password"]');
    expect(inputs.length).toBe(1);
  });

  test('Renders input with text type', () => {
    render(<Input type="text" />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  test('value prop controls input', () => {
    render(<Input value="test value" readOnly />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('test value');
  });

  test('onChange handler fires with new value', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ target: expect.objectContaining({ value: 'new value' }) }));
  });

  test('Disabled state prevents input', () => {
    render(<Input disabled value="can't edit" />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
