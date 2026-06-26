/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhaseFieldRenderer from './PhaseFieldRenderer';
import type { PhaseField } from '../../lib/pptx/phaseDefinitions';

function makeField(overrides: Partial<PhaseField> = {}): PhaseField {
  return {
    name: 'test_field',
    label: 'Test Field',
    type: 'text',
    default: '',
    placeholder: 'Enter value',
    options: [],
    ...overrides,
  };
}

function renderField(field: PhaseField, value: unknown = '') {
  const onChange = vi.fn();
  render(
    <PhaseFieldRenderer
      field={field}
      value={value}
      onChange={onChange}
      disabled={false}
    />
  );
  return onChange;
}

describe('PhaseFieldRenderer', () => {
  test('renders text input by default', () => {
    const field = makeField({ type: 'text' });
    renderField(field, 'initial value');
    const input = screen.getByRole('textbox');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('initial value');
  });

  test('text input calls onChange with correct name and value', () => {
    const field = makeField({ name: 'nombre', type: 'text' });
    const onChange = renderField(field, '');
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hola' } });
    expect(onChange).toHaveBeenCalledWith('nombre', 'Hola');
  });

  test('renders textarea when type=textarea', () => {
    const field = makeField({ name: 'desc', type: 'textarea' });
    renderField(field, 'initial');
    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect((textarea as HTMLTextAreaElement).value).toBe('initial');
  });

  test('renders select when type=select', () => {
    const field = makeField({
      name: 'nivel',
      type: 'select',
      options: ['Fácil', 'Medio', 'Difícil'],
    });
    renderField(field, 'Medio');
    const select = screen.getByRole('combobox');
    expect(select).toBeTruthy();
    expect((select as HTMLSelectElement).value).toBe('Medio');
  });

  test('renders checkbox when type=checkbox', () => {
    const field = makeField({ name: 'enabled', type: 'checkbox' });
    renderField(field, true);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeTruthy();
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  test('uses default value when value is undefined', () => {
    const field = makeField({ name: 'color', type: 'text', default: 'rojo' });
    render(
      <PhaseFieldRenderer
        field={field}
        value={undefined}
        onChange={() => {}}
        disabled={false}
      />
    );
    const input = screen.getByRole('textbox');
    expect((input as HTMLInputElement).value).toBe('rojo');
  });
});
