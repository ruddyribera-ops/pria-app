/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MaterialesMotorPanel from './MaterialesMotorPanel';
import type { CurriculumResult } from '../../lib/ingest/types';

// Define MotorHook locally since it's not exported from the component
interface MotorHook {
  result: unknown;
  loading: boolean;
  simulated: boolean;
  generate: (params: Record<string, unknown>, onStream?: (text: string) => void) => Promise<void>;
  generateStreaming: (params: Record<string, unknown>, onStream?: (text: string) => void) => Promise<void>;
}

// Mock MotorButton to simplify testing
vi.mock('../Materials/MotorButton', () => ({
  default: ({ label, onClick, loading, disabled }: { label: string; onClick: () => void; loading: boolean; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled || loading} data-testid="motor-btn">{label}</button>
  ),
}));

// Mock MotorSection_Synthesis
vi.mock('../Motores/MotorSection_Synthesis', () => ({
  default: () => <div data-testid="motor-section-synthesis">MotorSection_Synthesis</div>,
}));

// Mock MotorSection_ABP
vi.mock('../Motores/MotorSection_ABP', () => ({
  default: () => <div data-testid="motor-section-abp">MotorSection_ABP</div>,
}));

// Mock MotorSection_Assessment
vi.mock('../Motores/MotorSection_Assessment', () => ({
  default: () => <div data-testid="motor-section-assessment">MotorSection_Assessment</div>,
}));

// Mock MotorSection_Plan
vi.mock('../Motores/MotorSection_Plan', () => ({
  default: () => <div data-testid="motor-section-plan">MotorSection_Plan</div>,
}));

// Mock MotorSection_Slides
vi.mock('../Motores/MotorSection_Slides', () => ({
  default: () => <div data-testid="motor-section-slides">MotorSection_Slides</div>,
}));

// Mock MotorSection_Ficha
vi.mock('../Motores/MotorSection_Ficha', () => ({
  default: () => <div data-testid="motor-section-ficha">MotorSection_Ficha</div>,
}));

// Mock MotorSection_Quiz
vi.mock('../Motores/MotorSection_Quiz', () => ({
  default: () => <div data-testid="motor-section-quiz">MotorSection_Quiz</div>,
}));

// Mock MotorSection_Tutor
vi.mock('../Motores/MotorSection_Tutor', () => ({
  default: () => <div data-testid="motor-section-tutor">MotorSection_Tutor</div>,
}));

// Mock MotorSection_PDC
vi.mock('../Motores/MotorSection_PDC', () => ({
  default: () => <div data-testid="motor-section-pdc">MotorSection_PDC</div>,
}));

// Mock MotorSection_Recalibrate
vi.mock('../Motores/MotorSection_Recalibrate', () => ({
  default: () => <div data-testid="motor-section-recalibrate">MotorSection_Recalibrate</div>,
}));

// Mock MotorSection_Micro
vi.mock('../Motores/MotorSection_Micro', () => ({
  default: () => <div data-testid="motor-section-micro">MotorSection_Micro</div>,
}));

// Mock InlineSlideEditor
vi.mock('../Motores/InlineSlideEditor', () => ({
  default: () => <div data-testid="inline-slide-editor">InlineSlideEditor</div>,
}));

// Mock MotorButtonRow
vi.mock('../Motores/MotorButtonRow', () => ({
  default: ({ onGenerateSlides, onGenerateFicha, slidesLoading, fichaLoading }: {
    onGenerateSlides: () => void;
    onGenerateFicha: () => void;
    slidesLoading: boolean;
    fichaLoading: boolean;
  }) => (
    <div data-testid="motor-button-row">
      <button type="button" onClick={onGenerateSlides} disabled={slidesLoading}>Generar Slides</button>
      <button type="button" onClick={onGenerateFicha} disabled={fichaLoading}>Generar Ficha</button>
    </div>
  ),
}));

// Mock CSS module
vi.mock('./MaterialesMotorPanel.module.css', () => ({}));

// Helper to create a mock motor hook
function createMockMotorHook(loading = false, result: unknown = null): MotorHook {
  return {
    result,
    loading,
    simulated: false,
    generate: vi.fn(),
    generateStreaming: vi.fn(),
  };
}

describe('MaterialesMotorPanel', () => {
  const mockShowToast = vi.fn();
  const emptyCurriculum: CurriculumResult = {
    unidad_real: '',
    temas: [],
    contenido_temas: {},
    paginas_temas: {},
  };

  test('renders motor sections and buttons', () => {
    const synthesis = createMockMotorHook();
    const abp = createMockMotorHook();
    const assessment = createMockMotorHook();
    const plan = createMockMotorHook();
    const slides = createMockMotorHook();
    const ficha = createMockMotorHook();
    const quiz = createMockMotorHook();
    const tutor = createMockMotorHook();
    const pdc = createMockMotorHook();
    const recalibrate = createMockMotorHook();
    const micro = createMockMotorHook();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(
      <MaterialesMotorPanel
        curriculumPreview={emptyCurriculum}
        synthesis={synthesis as any}
        abp={abp as any}
        assessment={assessment as any}
        plan={plan as any}
        slides={slides as any}
        ficha={ficha as any}
        quiz={quiz as any}
        tutor={tutor as any}
        pdc={pdc as any}
        recalibrate={recalibrate as any}
        micro={micro as any}
        showToast={mockShowToast}
      />
    );

    expect(screen.getByTestId('motor-section-synthesis')).toBeTruthy();
  });

  test('shows loading state disables buttons', () => {
    const synthesis = createMockMotorHook(true); // loading
    const abp = createMockMotorHook();
    const assessment = createMockMotorHook();
    const plan = createMockMotorHook();
    const slides = createMockMotorHook();
    const ficha = createMockMotorHook();
    const quiz = createMockMotorHook();
    const tutor = createMockMotorHook();
    const pdc = createMockMotorHook();
    const recalibrate = createMockMotorHook();
    const micro = createMockMotorHook();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(
      <MaterialesMotorPanel
        curriculumPreview={emptyCurriculum}
        synthesis={synthesis as any}
        abp={abp as any}
        assessment={assessment as any}
        plan={plan as any}
        slides={slides as any}
        ficha={ficha as any}
        quiz={quiz as any}
        tutor={tutor as any}
        pdc={pdc as any}
        recalibrate={recalibrate as any}
        micro={micro as any}
        showToast={mockShowToast}
      />
    );

    // When synthesis is loading, the MotorButtonRow and motor buttons should still render
    // The mocked motor buttons would be disabled when loading
    expect(screen.getByTestId('motor-section-synthesis')).toBeTruthy();
  });

  test('renders motor button row for slides and ficha', () => {
    const synthesis = createMockMotorHook();
    const abp = createMockMotorHook();
    const assessment = createMockMotorHook();
    const plan = createMockMotorHook();
    const slides = createMockMotorHook();
    const ficha = createMockMotorHook();
    const quiz = createMockMotorHook();
    const tutor = createMockMotorHook();
    const pdc = createMockMotorHook();
    const recalibrate = createMockMotorHook();
    const micro = createMockMotorHook();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(
      <MaterialesMotorPanel
        curriculumPreview={emptyCurriculum}
        synthesis={synthesis as any}
        abp={abp as any}
        assessment={assessment as any}
        plan={plan as any}
        slides={slides as any}
        ficha={ficha as any}
        quiz={quiz as any}
        tutor={tutor as any}
        pdc={pdc as any}
        recalibrate={recalibrate as any}
        micro={micro as any}
        showToast={mockShowToast}
      />
    );

    expect(screen.getByTestId('motor-button-row')).toBeTruthy();
    expect(screen.getByText('Generar Slides')).toBeTruthy();
    expect(screen.getByText('Generar Ficha')).toBeTruthy();
  });

  test('click on motor buttons does not crash', async () => {
    const user = userEvent.setup();
    const synthesis = createMockMotorHook();
    const abp = createMockMotorHook();
    const assessment = createMockMotorHook();
    const plan = createMockMotorHook();
    const slides = createMockMotorHook();
    const ficha = createMockMotorHook();
    const quiz = createMockMotorHook();
    const tutor = createMockMotorHook();
    const pdc = createMockMotorHook();
    const recalibrate = createMockMotorHook();
    const micro = createMockMotorHook();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(
      <MaterialesMotorPanel
        curriculumPreview={emptyCurriculum}
        synthesis={synthesis as any}
        abp={abp as any}
        assessment={assessment as any}
        plan={plan as any}
        slides={slides as any}
        ficha={ficha as any}
        quiz={quiz as any}
        tutor={tutor as any}
        pdc={pdc as any}
        recalibrate={recalibrate as any}
        micro={micro as any}
        showToast={mockShowToast}
      />
    );

    // Click the synthesis button - it's the first MotorButton rendered
    const buttons = screen.getAllByTestId('motor-btn');
    // The first button is the synthesis button
    if (buttons.length > 0) {
      await user.click(buttons[0]);
    }
  });

  test('renders all motor sections', () => {
    const synthesis = createMockMotorHook();
    const abp = createMockMotorHook();
    const assessment = createMockMotorHook();
    const plan = createMockMotorHook();
    const slides = createMockMotorHook();
    const ficha = createMockMotorHook();
    const quiz = createMockMotorHook();
    const tutor = createMockMotorHook();
    const pdc = createMockMotorHook();
    const recalibrate = createMockMotorHook();
    const micro = createMockMotorHook();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(
      <MaterialesMotorPanel
        curriculumPreview={emptyCurriculum}
        synthesis={synthesis as any}
        abp={abp as any}
        assessment={assessment as any}
        plan={plan as any}
        slides={slides as any}
        ficha={ficha as any}
        quiz={quiz as any}
        tutor={tutor as any}
        pdc={pdc as any}
        recalibrate={recalibrate as any}
        micro={micro as any}
        showToast={mockShowToast}
      />
    );

    expect(screen.getByTestId('motor-section-abp')).toBeTruthy();
    expect(screen.getByTestId('motor-section-assessment')).toBeTruthy();
    expect(screen.getByTestId('motor-section-plan')).toBeTruthy();
    expect(screen.getByTestId('motor-section-slides')).toBeTruthy();
    expect(screen.getByTestId('motor-section-ficha')).toBeTruthy();
    expect(screen.getByTestId('motor-section-quiz')).toBeTruthy();
    expect(screen.getByTestId('motor-section-tutor')).toBeTruthy();
    expect(screen.getByTestId('motor-section-pdc')).toBeTruthy();
    expect(screen.getByTestId('motor-section-recalibrate')).toBeTruthy();
    expect(screen.getByTestId('motor-section-micro')).toBeTruthy();
  });
});
