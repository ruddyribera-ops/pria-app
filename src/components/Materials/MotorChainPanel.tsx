import { type ReactNode } from 'react';

interface MotorChainPanelProps {
  /** Contenido del panel (botones y resultados de motores) */
  children: ReactNode;
}

/**
 * Panel contenedor para la cadena de operaciones de motores.
 * La cadena es implícita: cada motor se habilita condicionalmente
 * según los resultados del motor anterior (ej: ABP aparece después de Síntesis).
 */
export default function MotorChainPanel({ children }: MotorChainPanelProps) {
  return <>{children}</>;
}
