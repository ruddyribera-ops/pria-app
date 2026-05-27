import { createElement } from 'react';
import type { ReactNode } from 'react';
import MotorButton from './MotorButton';

export function createAbpButton(
  synthesisResult: Record<string, unknown> | null,
  generatingAbp: boolean,
  onGenerateAbp: () => void,
): ReactNode {
  if (!synthesisResult) return null;
  return createElement(MotorButton, {
    label: '🚀 Generar Proyecto ABP',
    loadingLabel: '🚀 Generando proyecto ABP...',
    color: '#2563EB',
    onClick: onGenerateAbp,
    loading: generatingAbp,
  });
}
