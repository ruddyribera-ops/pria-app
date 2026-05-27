interface LoadingSkeletonProps {
  type: 'table' | 'card' | 'text';
  rows?: number;
}

export default function LoadingSkeleton({ type, rows = 5 }: LoadingSkeletonProps) {
  if (type === 'table') {
    return (
      <div style={{ border: '1px solid #e6e6eb', borderRadius: '8px', overflow: 'hidden' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{
            padding: '0.75rem 1rem', borderBottom: i < rows - 1 ? '1px solid #e6e6eb' : 'none',
            display: 'flex', gap: '1rem',
          }}>
            <div style={{ flex: 2, height: '14px', background: '#e6e6eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            <div style={{ flex: 1, height: '14px', background: '#e6e6eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            <div style={{ flex: 1, height: '14px', background: '#e6e6eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            <div style={{ flex: 1, height: '14px', background: '#e6e6eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            border: '1px solid #e6e6eb', borderRadius: '8px', padding: '1rem', minHeight: '200px',
          }}>
            <div style={{ height: '14px', width: '60%', background: '#e6e6eb', borderRadius: '4px', marginBottom: '0.75rem', animation: 'pulse 1.5s infinite' }} />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} style={{
                height: '10px', background: '#e6e6eb', borderRadius: '4px', marginBottom: '0.5rem',
                width: `${70 + j * 10}%`, animation: 'pulse 1.5s infinite',
              }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // text type
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: '12px', background: '#e6e6eb', borderRadius: '4px', marginBottom: '0.5rem',
          width: `${80 - i * 10}%`, animation: 'pulse 1.5s infinite',
        }} />
      ))}
    </div>
  );
}
