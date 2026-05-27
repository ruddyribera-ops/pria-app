interface MotorButtonProps {
  /** Etiqueta del botón (texto + emoji) */
  label: string;
  /** Etiqueta cuando está generando */
  loadingLabel: string;
  /** Color de fondo (hex) */
  color: string;
  /** Handler al hacer clic */
  onClick: () => void;
  /** Si está en proceso de generación */
  loading: boolean;
  /** Texto accesorio opcional */
  subtitle?: string;
}

export default function MotorButton({
  label,
  loadingLabel,
  color,
  onClick,
  loading,
  subtitle,
}: MotorButtonProps) {
  const buttonElement = (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '0.5rem 1.25rem', background: color, color: '#fff',
        border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );

  // With subtitle: render as a bordered section with label above the button.
  // Without subtitle: render just the button — used inline in synthesis blocks, fragments, etc.
  if (subtitle) {
    return (
      <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
        <div style={{ fontSize: '0.6875rem', color: '#6b6b80', marginBottom: '0.5rem' }}>
          {subtitle}
        </div>
        {buttonElement}
      </div>
    );
  }

  return buttonElement;
}
