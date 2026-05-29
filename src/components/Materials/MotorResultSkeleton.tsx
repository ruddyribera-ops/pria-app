/**
 * MotorResultSkeleton — Pulsing placeholder for motor results while loading.
 */
export default function MotorResultSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e6e6eb',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: '#f0f0f5',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              height: '14px', width: '60%', borderRadius: '4px',
              background: '#f0f0f5',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <div style={{
              height: '10px', width: '35%', borderRadius: '4px',
              background: '#f0f0f5',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: '0.2s',
            }} />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}