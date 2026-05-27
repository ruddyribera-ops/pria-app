interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <div className="page-header" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.375rem', fontWeight: 600, color: '#1e1e2f' }}>{title}</h2>
      <p style={{ fontSize: '0.8125rem', color: '#6b6b80', marginTop: '0.25rem' }}>{subtitle}</p>
    </div>
  );
}
