import MotorButton from './MotorButton';

interface AbpButtonSectionProps {
  synthesisResult: Record<string, unknown> | null;
  generatingAbp: boolean;
  onGenerateAbp: () => void;
}

export function AbpButtonSection({
  synthesisResult,
  generatingAbp,
  onGenerateAbp,
}: AbpButtonSectionProps): React.ReactNode {
  if (!synthesisResult) return null as React.ReactNode;

  return (
    <MotorButton
      label="🚀 Generar Proyecto ABP"
      loadingLabel="🚀 Generando proyecto ABP..."
      color="#2563EB"
      onClick={onGenerateAbp}
      loading={generatingAbp}
    />
  ) as React.ReactNode;
}
