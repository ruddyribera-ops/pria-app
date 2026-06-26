/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MotorSection_Export from './MotorSection_Export';

describe('MotorSection_Export', () => {
  test('renders null when no flags are true', () => {
    const { container } = render(
      <MotorSection_Export hasSlides={false} hasSynthesis={false} hasPlan={false} hasQuiz={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders Export Todo button when hasSlides is true', () => {
    render(
      <MotorSection_Export
        hasSlides={true}
        hasSynthesis={false}
        hasPlan={false}
        hasQuiz={false}
        onExportAll={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Exportar Todo/i })).toBeTruthy();
  });

  test('calls onExportAll when Export Todo button is clicked', () => {
    const handleExport = vi.fn();
    render(
      <MotorSection_Export
        hasSlides={true}
        hasSynthesis={true}
        hasPlan={true}
        hasQuiz={true}
        onExportAll={handleExport}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Exportar Todo/i }));
    expect(handleExport).toHaveBeenCalledTimes(1);
  });

  test('renders individual export buttons when respective flags are true', () => {
    render(
      <MotorSection_Export
        hasSlides={true}
        hasSynthesis={true}
        hasPlan={true}
        hasQuiz={true}
        onExportAll={vi.fn()}
        onExportSlides={vi.fn()}
        onExportSynthesis={vi.fn()}
        onExportPlan={vi.fn()}
        onExportQuiz={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Diapositivas/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sintesis/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Plan de Clase/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Quiz/i })).toBeTruthy();
  });
});
