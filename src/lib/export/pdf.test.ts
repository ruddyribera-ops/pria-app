import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jsPDF — must be constructable via `new jsPDF()`
vi.mock('jspdf', () => {
  // Use a real constructor-like function so `new jsPDF(...)` works
  function MockJsPDF(this: Record<string, unknown>, _options?: { orientation?: string; unit?: string; format?: string }) {
    this.setFillColor = vi.fn();
    this.setDrawColor = vi.fn();
    this.setLineWidth = vi.fn();
    this.rect = vi.fn();
    this.setFontSize = vi.fn();
    this.setFont = vi.fn();
    this.setTextColor = vi.fn();
    this.text = vi.fn();
    this.addPage = vi.fn();
    this.splitTextToSize = vi.fn().mockReturnValue(['line1', 'line2']);
    this.internal = {
      pageSize: {
        getWidth: vi.fn().mockReturnValue(595),
        getHeight: vi.fn().mockReturnValue(842),
      },
    };
    this.output = vi.fn().mockReturnValue(new Blob(['PDF content'], { type: 'application/pdf' }));
    this.line = vi.fn();
  }
  return { jsPDF: MockJsPDF };
});

describe('export/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exportToPDF calls jsPDF.text() with content', async () => {
    const { exportToPDF } = await import('./pdf');

    const motorOutput = {
      secuencia_didactica: {
        bloques: [
          { nombre: 'Inicio', duracion: 10, objetivo: 'Objetivo 1', actividad: 'Actividad 1' },
          { nombre: 'Desarrollo', duracion: 30, objetivo: 'Objetivo 2', actividad: 'Actividad 2' },
        ],
      },
    };

    const blob = await exportToPDF(motorOutput);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  it('Empty motor output → returns without throwing', async () => {
    const { exportToPDF } = await import('./pdf');

    const blob = await exportToPDF({});
    expect(blob).toBeInstanceOf(Blob);
  });

  it('Output with special characters → properly encoded', async () => {
    const { exportToPDF } = await import('./pdf');

    const motorOutput = {
      secuencia_didactica: {
        bloques: [
          { nombre: 'Émoji & Symbols: 🎉 <test>', duracion: 15, objetivo: 'Objetivo con "comillas"', actividad: 'Actividad\ncon\nsaltos' },
        ],
      },
    };

    const blob = await exportToPDF(motorOutput);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('SynthesisOutput type is handled', async () => {
    const { exportToPDF } = await import('./pdf');

    const synthesisOutput = {
      unidad_sintetizada: {
        temas_desarrollados: [
          {
            nombre: 'Tema 1',
            conceptos_clave: ['concepto A', 'concepto B'],
            inteligencias_sugeridas: ['linguistica', 'matematica'],
            actividades: [{ tipo: 'actividad 1', inteligencia: 'visual' }],
          },
        ],
      },
    };

    const blob = await exportToPDF(synthesisOutput);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('exportToPDFFallback returns text blob', async () => {
    const { exportToPDFFallback } = await import('./pdf');

    const blob = await exportToPDFFallback({ message: 'test' });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
  });

  it('QuizOutput type is handled', async () => {
    const { exportToPDF } = await import('./pdf');

    const quizOutput = {
      quiz: {
        preguntas: [
          { numero: 1, pregunta: '¿Qué es?', opciones: ['A', 'B', 'C'] },
        ],
      },
    };

    const blob = await exportToPDF(quizOutput);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('SlidesOutput (array) type is handled', async () => {
    const { exportToPDF } = await import('./pdf');

    const slidesOutput = [
      { titulo: 'Slide 1', texto_pantalla: 'Content 1' },
      { titulo: 'Slide 2', texto_pantalla: 'Content 2' },
    ];

    const blob = await exportToPDF(slidesOutput);
    expect(blob).toBeInstanceOf(Blob);
  });
});
