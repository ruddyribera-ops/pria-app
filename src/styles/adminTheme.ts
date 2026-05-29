// Shared style objects for AdminPage panels
export const adminTheme = {
  label: { display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' },
  input: { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d4d4e0', borderRadius: '4px', fontSize: '0.8125rem', outline: 'none', background: '#f8f8ff', boxSizing: 'border-box' as const },
  greenBtn: { padding: '0.5rem 1.5rem', background: '#3A9E5E', color: '#fff', border: 'none' as const, borderRadius: '4px', fontWeight: 500, fontSize: '0.8125rem', marginTop: '0.75rem', cursor: 'pointer' as const },
  card: { background: '#fff', border: '1px solid #e6e6eb', borderRadius: '8px', overflow: 'hidden' as const },
  tabBtn: (active: boolean) => ({
    padding: '0.5rem 1rem',
    border: active ? 'none' : '1px solid #e6e6eb',
    borderRadius: '4px',
    background: active ? '#3A9E5E' : '#fff',
    color: active ? '#fff' : '#6b6b80',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer' as const,
  }),
};
