interface StatusBadgeProps {
  status: string | boolean;
}

const STATUS_COLORS: Record<string, string> = {
  gray: '#b3b3cc',
  green: '#3A9E5E',
  yellow: '#f59e0b',
  red: '#ef4444',
  true: '#3A9E5E',
  false: '#f59e0b',
  activo: '#3A9E5E',
  pendiente: '#f59e0b',
  inactivo: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  true: '● Activo',
  false: '● Pendiente',
  activo: '● Activo',
  pendiente: '● Pendiente',
  inactivo: '● Inactivo',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const strStatus = String(status).toLowerCase();
  const color = STATUS_COLORS[strStatus] || '#b3b3cc';
  const label = STATUS_LABELS[strStatus] || `● ${status}`;

  return (
    <span style={{ color, fontWeight: 600, fontSize: '0.8125rem' }}>
      {label}
    </span>
  );
}
