/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CurriculumPreview from './CurriculumPreview';
import type { CurriculumResult } from '../../lib/ingest/types';

describe('CurriculumPreview', () => {
  test('renders "no curriculum" state when null', () => {
    // The component doesn't accept null directly - it always expects a CurriculumResult object
    // But if temas is empty, it shows the no curriculum state
    const emptyCurriculum: CurriculumResult = {
      unidad_real: '',
      temas: [],
      contenido_temas: {},
      paginas_temas: {},
    };
    render(<CurriculumPreview curriculumPreview={emptyCurriculum} rawText="" />);
    expect(screen.getByText('No se detectaron temas en este material')).toBeTruthy();
  });

  test('renders "no curriculum" state when temas is empty array', () => {
    const curriculum: CurriculumResult = {
      unidad_real: 'Unidad 1',
      temas: [],
      contenido_temas: {},
      paginas_temas: {},
    };
    render(<CurriculumPreview curriculumPreview={curriculum} rawText="some text content" />);
    expect(screen.getByText('No se detectaron temas en este material')).toBeTruthy();
  });

  test('renders curriculum content when provided', () => {
    const curriculum: CurriculumResult = {
      unidad_real: 'Unidad 1: Introducción',
      temas: ['Tema 1', 'Tema 2'],
      contenido_temas: {
        'Tema 1': 'Contenido del tema 1',
        'Tema 2': 'Contenido del tema 2',
      },
      paginas_temas: {
        'Tema 1': 'pp. 10-15',
        'Tema 2': 'pp. 20-25',
      },
    };
    render(<CurriculumPreview curriculumPreview={curriculum} rawText="" />);
    
    expect(screen.getByText('Unidad 1: Introducción')).toBeTruthy();
    expect(screen.getByText('Tema 1')).toBeTruthy();
    expect(screen.getByText('Tema 2')).toBeTruthy();
    expect(screen.getByText(/Se detectaron 2 tema/)).toBeTruthy();
  });

  test('renders units and topics correctly', () => {
    const curriculum: CurriculumResult = {
      unidad_real: 'Capítulo 3',
      temas: ['Ecosistemas', 'Cadenas alimenticias'],
      contenido_temas: {
        'Ecosistemas': 'Un ecosistema es una comunidad de seres vivos...',
        'Cadenas alimenticias': 'Las cadenas alimenticias muestran...',
      },
      paginas_temas: {},
    };
    render(<CurriculumPreview curriculumPreview={curriculum} rawText="" />);
    
    expect(screen.getByText('Capítulo 3')).toBeTruthy();
    expect(screen.getByText('Ecosistemas')).toBeTruthy();
    expect(screen.getByText('Cadenas alimenticias')).toBeTruthy();
  });

  test('renders tema content preview', () => {
    const curriculum: CurriculumResult = {
      unidad_real: 'Test',
      temas: ['Test Tema'],
      contenido_temas: {
        'Test Tema': 'Este es el contenido del tema de prueba.',
      },
      paginas_temas: {},
    };
    render(<CurriculumPreview curriculumPreview={curriculum} rawText="" />);
    expect(screen.getByText(/Este es el contenido del tema/)).toBeTruthy();
  });

  test('renders page numbers when available', () => {
    const curriculum: CurriculumResult = {
      unidad_real: 'Test',
      temas: ['Test Tema'],
      contenido_temas: { 'Test Tema': 'Content' },
      paginas_temas: { 'Test Tema': 'pp. 45-62' },
    };
    render(<CurriculumPreview curriculumPreview={curriculum} rawText="" />);
    expect(screen.getByText('📄 pp. 45-62')).toBeTruthy();
  });

  test('renders raw text preview when rawText is provided', () => {
    const curriculum: CurriculumResult = {
      unidad_real: '',
      temas: [],
      contenido_temas: {},
      paginas_temas: {},
    };
    const longText = 'A'.repeat(5000);
    render(<CurriculumPreview curriculumPreview={curriculum} rawText={longText} />);
    expect(screen.getByText(/Texto extraído/)).toBeTruthy();
    expect(screen.getAllByText(/\(5000 caracteres\)/).length).toBeGreaterThanOrEqual(1);
  });

  test('truncates long content preview', () => {
    const curriculum: CurriculumResult = {
      unidad_real: 'Test',
      temas: ['Test Tema'],
      contenido_temas: {
        'Test Tema': 'A'.repeat(300), // more than 200 chars
      },
      paginas_temas: {},
    };
    render(<CurriculumPreview curriculumPreview={curriculum} rawText="" />);
    // Should show truncated content with ellipsis
    // The ellipsis is part of a text node split across elements
    expect(screen.getByText(/…$/)).toBeTruthy();
  });
});
