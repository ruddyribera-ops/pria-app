/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultPreview from './ResultPreview';

describe('ResultPreview', () => {
  test('renders null data as empty', () => {
    render(<ResultPreview data={null} />);
    expect(screen.getByText(/Sin resultados/)).toBeTruthy();
  });

  test('renders string data', () => {
    render(<ResultPreview data="This is a simple string" />);
    expect(screen.getByText('This is a simple string')).toBeTruthy();
  });

  test('renders number data', () => {
    render(<ResultPreview data={42} />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  test('renders array of strings', () => {
    render(<ResultPreview data={['Apple', 'Banana', 'Cherry']} />);
    expect(screen.getByText('Apple')).toBeTruthy();
    expect(screen.getByText('Banana')).toBeTruthy();
  });

  test('renders object with title and description', () => {
    render(
      <ResultPreview
        data={{
          title: 'Concept A',
          description: 'Description of concept A',
        }}
      />
    );
    expect(screen.getByText('Concept A')).toBeTruthy();
    expect(screen.getByText('Description of concept A')).toBeTruthy();
  });

  test('renders title prop override', () => {
    render(
      <ResultPreview
        data="Some content"
        title="Custom Title"
      />
    );
    expect(screen.getByText('Custom Title')).toBeTruthy();
  });

  test('renders objectivesBloom as bloom list', () => {
    render(
      <ResultPreview
        data={{
          objetivosBloom: ['Remember', 'Understand', 'Apply'],
        }}
      />
    );
    expect(screen.getByText('Recordar')).toBeTruthy();
    expect(screen.getByText('Remember')).toBeTruthy();
  });
});
