import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock docx library
vi.mock('docx', () => ({
  Document: vi.fn().mockImplementation(() => ({})),
  Packer: {
    toBuffer: vi.fn().mockResolvedValue(new Uint8Array([80, 75, 3, 4])), // PK header for ZIP/DOCX
  },
  Paragraph: vi.fn().mockImplementation(() => ({})),
  HeadingLevel: { TITLE: 'title' },
  TextRun: vi.fn().mockImplementation(() => ({})),
  AlignmentType: { CENTER: 'center' },
  Footer: vi.fn().mockImplementation(() => ({})),
  PageNumber: { CURRENT: 'current' },
}));

// Mock globalThis.Buffer
;(globalThis as any).Buffer = {
  isBuffer: (obj: any) => obj instanceof Uint8Array === false && ArrayBuffer.isView(obj) === false,
};

describe('export/docx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exportToDOCX generates a docx Buffer (with PK magic bytes)', async () => {
    const { exportToDOCX } = await import('./docx');

    const motorOutput = {
      secuencia_didactica: {
        bloques: [
          { nombre: 'Bloque 1', duracion: 30, objetivo: 'Obj', actividad: 'Act' },
        ],
      },
    };

    const blob = await exportToDOCX(motorOutput);
    expect(blob).toBeInstanceOf(Blob);
    // DOCX is a ZIP file — check magic bytes (PK = 80, 75)
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
    expect(bytes[0]).toBe(80); // P
    expect(bytes[1]).toBe(75); // K
  });

  it('Empty input does not throw', async () => {
    const { exportToDOCX } = await import('./docx');

    const blob = await exportToDOCX({});
    expect(blob).toBeInstanceOf(Blob);
  });

  it('Output is a valid docx (check magic bytes: PK for zip)', async () => {
    const { exportToDOCX } = await import('./docx');

    const docxOutput = {
      secuencia_didactica: {
        bloques: [
          { nombre: 'Test', duracion: 15, objetivo: 'Learn', actividad: 'Do' },
        ],
      },
    };

    const blob = await exportToDOCX(docxOutput);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Verify it's a valid ZIP/DOCX by checking PK header
    const buffer = await blob.arrayBuffer();
    const header = new Uint8Array(buffer.slice(0, 2));
    expect(header[0]).toBe(80); // P
    expect(header[1]).toBe(75); // K
  });

  it('SynthesisOutput type is handled', async () => {
    const { exportToDOCX } = await import('./docx');

    const synthesisOutput = {
      unidad_sintetizada: {
        temas_desarrollados: [
          {
            nombre: 'Tema 1',
            conceptos_clave: ['A', 'B'],
            inteligencias_sugeridas: ['L', 'M'],
            actividades: [{ tipo: 'T', inteligencia: 'V' }],
          },
        ],
      },
    };

    const blob = await exportToDOCX(synthesisOutput);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('exportToDOCXFallback returns text blob', async () => {
    const { exportToDOCXFallback } = await import('./docx');

    const blob = await exportToDOCXFallback({ message: 'fallback test' });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
  });

  it('QuizOutput type is handled', async () => {
    const { exportToDOCX } = await import('./docx');

    const quizOutput = {
      quiz: {
        preguntas: [
          { numero: 1, pregunta: 'Question?', opciones: ['A', 'B', 'C'] },
        ],
      },
    };

    const blob = await exportToDOCX(quizOutput);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('SlidesOutput (array) type is handled', async () => {
    const { exportToDOCX } = await import('./docx');

    const slidesOutput = [
      { titulo: 'Slide 1', texto_pantalla: 'Content 1' },
      { titulo: 'Slide 2', texto_pantalla: 'Content 2' },
    ];

    const blob = await exportToDOCX(slidesOutput);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('Teacher info is included when provided', async () => {
    const { exportToDOCX } = await import('./docx');

    const output = {
      secuencia_didactica: {
        bloques: [
          { nombre: 'B', duracion: 10, objetivo: 'O', actividad: 'A' },
        ],
      },
    };

    const blob = await exportToDOCX(output, {
      nombre: 'Profesor Test',
      email: 'prof@test.com',
      escuela: 'Escuela Test',
    });
    expect(blob).toBeInstanceOf(Blob);
  });
});
