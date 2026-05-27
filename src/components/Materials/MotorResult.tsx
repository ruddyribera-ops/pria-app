interface MotorResultProps {
  /** Título de la sección (con emoji) */
  title: string;
  children: React.ReactNode;
}

/**
 * Contenedor genérico para mostrar el resultado de un motor.
 * Encapsula el borde superior, título y padding estándar.
 */
export default function MotorResult({ title, children }: MotorResultProps) {
  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{
        fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.75rem',
      }}>
        {title}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#4a4a5a' }}>
        {children}
      </div>
    </div>
  );
}
