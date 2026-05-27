import MotorButton from './MotorButton';

interface AbpButtonFragmentProps {
  synthesisResult: Record<string, unknown> | null;
  generatingAbp: boolean;
  handleGenerateAbp: () => void;
}

export function AbpButtonFragment({
  synthesisResult,
  generatingAbp,
  handleGenerateAbp,
}: AbpButtonFragmentProps) {
  const element: React.ReactNode = synthesisResult
    ? <MotorButton
        label="🚀 Generar Proyecto ABP"
        loadingLabel="🚀 Generando proyecto ABP..."
        color="#2563EB"
        onClick={handleGenerateAbp}
        loading={generatingAbp}
      />
    : null;
  return <>{element}</>;
}
