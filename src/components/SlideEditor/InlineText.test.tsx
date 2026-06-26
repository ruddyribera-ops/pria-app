/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineText from './InlineText';

describe('InlineText', () => {
  test('renders value text when not editing', () => {
    render(
      <InlineText
        id="test"
        value="Hello world"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  test('shows placeholder when value is empty', () => {
    render(
      <InlineText
        id="test"
        value=""
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText(/Click para editar/)).toBeTruthy();
  });

  test('enters edit mode on click', async () => {
    const user = userEvent.setup();
    render(
      <InlineText
        id="test-id"
        value="Test value"
        onChange={vi.fn()}
      />
    );
    // First verify the span is there
    const span = screen.getByText('Test value');
    expect(span).toBeTruthy();
    // Click to enter edit mode
    await user.click(span);
    // Query for the input - it should now be present
    const input = screen.queryByRole('textbox') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('Test value');
  });

  test('calls onChange when input changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <InlineText
        id="test"
        value="Initial"
        onChange={handleChange}
      />
    );
    await user.click(screen.getByText('Initial'));
    const input = screen.queryByRole('textbox') as HTMLInputElement;
    expect(input).toBeTruthy();
    await user.clear(input);
    await user.type(input, 'Nuevo');
    await user.keyboard('{Tab}');
    expect(handleChange).toHaveBeenCalledWith('test', 'Nuevo');
  });

  test('blurs on Enter key', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <InlineText
        id="test"
        value="Hello"
        onChange={handleChange}
      />
    );
    await user.click(screen.getByText('Hello'));
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    await user.keyboard('{Enter}');
    expect(input).not.toBeInTheDocument();
  });
});
