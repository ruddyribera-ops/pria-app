import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHealthCheck } from '../../hooks/useHealthCheck';
import { MOTORS, getMockEstadoSistema, getEstadoSistema } from '../../api/admin';

interface SidebarProps {
  nivel: string;
  grado: string;
  onNivelChange: (n: string) => void;
  onGradoChange: (g: string) => void;
}

export default function Sidebar({ nivel, grado, onNivelChange, onGradoChange }: SidebarProps) {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [estadoOpen, setEstadoOpen] = useState(false);
  const [estado, setEstado] = useState<Record<string, string> | null>(null);
  const health = useHealthCheck();

  // Poll estado-sistema every 5s when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setEstado(getMockEstadoSistema().motors);
      return;
    }

    const fetchEstado = async () => {
      try {
        const data = await getEstadoSistema();
        setEstado(data.motors);
      } catch {
        setEstado(getMockEstadoSistema().motors);
      }
    };

    fetchEstado();
    const interval = setInterval(fetchEstado, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const initials = user?.nombre
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.625rem',
    padding: '0.55rem 1.25rem', fontSize: '0.8125rem',
    color: isActive ? '#ffffff' : '#b3b3cc',
    cursor: 'pointer', transition: 'all .15s',
    borderLeft: isActive ? '2px solid #3A9E5E' : '2px solid transparent',
    background: isActive ? '#3a3b4e' : 'transparent',
    fontWeight: isActive ? 500 : 400,
    textDecoration: 'none',
  });

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, width: '260px', height: '100vh',
      background: '#1c1e24', color: '#b3b3cc', display: 'flex', flexDirection: 'column',
      zIndex: 100, overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '1.0625rem', fontWeight: 600, color: '#fff' }}>
          <div style={{
            width: '32px', height: '32px', background: '#3A9E5E', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            PR
          </div>
          <div>
            PRIA <span style={{ fontSize: '0.625rem', fontWeight: 400, color: '#b3b3cc', display: 'block', marginTop: '-2px' }}>v10</span>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div
        style={{
          padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
          transition: 'background .15s', position: 'relative',
        }}
        onClick={() => setProfileOpen(!profileOpen)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2e2f3e'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <div style={{
          width: '36px', height: '36px', background: '#3A9E5E', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8125rem', fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.nombre || 'Usuario'} <span style={{ fontSize: '0.55rem', color: '#b3b3cc', display: 'inline-block', transition: 'transform .2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#b3b3cc', display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '1px' }}>
            👑 {user?.role === 'admin' ? 'Administrador' : 'Docente'} · {user?.nombre || ''}
          </div>
        </div>

        {/* Profile dropdown */}
        {profileOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: '0.5rem', right: '0.5rem',
            background: '#fff', borderRadius: '8px', border: '1px solid #e6e6eb',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '0.75rem', zIndex: 300,
            minWidth: '200px',
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '0.35rem 0', fontSize: '0.75rem', color: '#1e1e2f' }}>
              <div style={{ fontSize: '0.625rem', color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>Nombre</div>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1e1e2f' }}>{user?.nombre}</div>
            </div>
            <div style={{ padding: '0.35rem 0', fontSize: '0.75rem', color: '#1e1e2f' }}>
              <div style={{ fontSize: '0.625rem', color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>Rol</div>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1e1e2f' }}>{user?.role}</div>
            </div>
            <div style={{ borderTop: '1px solid #e6e6eb', margin: '0.5rem 0' }} />
            <div
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.625rem',
                borderRadius: '4px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600,
                cursor: 'pointer', transition: 'background .15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              🚪 Cerrar Sesión
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ paddingBottom: '0.5rem' }}>
        {/* Section: Generación */}
        <div style={{ padding: '0.75rem 1.25rem 0.375rem', fontSize: '0.625rem', fontWeight: 600, color: '#b3b3cc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🎨 Generación
        </div>
        <NavLink to="/slides" style={({ isActive }) => navLinkStyle(isActive)}>
          <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>🖼️</span>
          <span>Diapositivas</span>
        </NavLink>

        {/* Section: Planificación */}
        <div style={{ padding: '0.75rem 1.25rem 0.375rem', fontSize: '0.625rem', fontWeight: 600, color: '#b3b3cc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          📅 Planificación
        </div>
        <NavLink to="/diario" style={({ isActive }) => navLinkStyle(isActive)}>
          <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>🌅</span>
          <span>Diario</span>
        </NavLink>
        <NavLink to="/semanal" style={({ isActive }) => navLinkStyle(isActive)}>
          <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>📅</span>
          <span>Semanal</span>
        </NavLink>
        <NavLink to="/trimestral" style={({ isActive }) => navLinkStyle(isActive)}>
          <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>📆</span>
          <span>Trimestral</span>
        </NavLink>

        {/* Section: Recursos */}
        <div style={{ padding: '0.75rem 1.25rem 0.375rem', fontSize: '0.625rem', fontWeight: 600, color: '#b3b3cc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          📦 Recursos
        </div>
        <NavLink to="/materiales" style={({ isActive }) => navLinkStyle(isActive)}>
          <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>📥</span>
          <span>Materiales</span>
        </NavLink>
        <NavLink to="/diagnosticos" style={({ isActive }) => navLinkStyle(isActive)}>
          <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>🩺</span>
          <span>Diagnósticos</span>
        </NavLink>

        {/* Section: Administración (solo admin) */}
        {isAdmin && (
          <>
            <div style={{ padding: '0.75rem 1.25rem 0.375rem', fontSize: '0.625rem', fontWeight: 600, color: '#b3b3cc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⚙️ Administración
            </div>
            <NavLink to="/admin" style={({ isActive }) => navLinkStyle(isActive)}>
              <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>⚙️</span>
              <span>Panel Admin</span>
            </NavLink>
          </>
        )}

        {/* Nivel Educativo (global selector) */}
        <div style={{ padding: '0.5rem 1.25rem 0.625rem', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.25rem', marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 600, color: '#b3b3cc', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            🎓 Nivel Educativo
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <label style={{ fontSize: '0.625rem', color: '#b3b3cc', minWidth: '2.5rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Nivel:</label>
            <select
              value={nivel}
              onChange={(e) => onNivelChange(e.target.value)}
              style={{
                flex: 1, padding: '0.3rem 0.4rem', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px', background: '#2e2f3e', color: '#f1f5f9',
                fontSize: '0.6875rem', outline: 'none', cursor: 'pointer',
              }}
            >
              <option>Primaria</option>
              <option>Secundaria</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <label style={{ fontSize: '0.625rem', color: '#b3b3cc', minWidth: '2.5rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Grado:</label>
            <select
              value={grado}
              onChange={(e) => onGradoChange(e.target.value)}
              style={{
                flex: 1, padding: '0.3rem 0.4rem', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px', background: '#2e2f3e', color: '#f1f5f9',
                fontSize: '0.6875rem', outline: 'none', cursor: 'pointer',
              }}
            >
              <option>5to primaria</option>
              <option>4to primaria</option>
              <option>3ro primaria</option>
              <option>2do primaria</option>
              <option>1ro primaria</option>
            </select>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Estado del Sistema */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0.25rem 0' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.4rem 1.25rem', fontSize: '0.625rem', fontWeight: 600,
              color: '#b3b3cc', textTransform: 'uppercase', letterSpacing: '0.06em',
              cursor: 'pointer', userSelect: 'none', transition: 'color .15s',
            }}
            onClick={() => setEstadoOpen(!estadoOpen)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#b3b3cc'; }}
          >
            <span>📊 Estado del Sistema</span>
            <span style={{
              fontSize: '0.5rem', color: '#b3b3cc', transition: 'transform .2s',
              display: 'inline-block', transform: estadoOpen ? 'rotate(90deg)' : 'none',
            }}>▶</span>
          </div>
          <div style={{
            overflow: 'hidden', maxHeight: estadoOpen ? '320px' : '0',
            transition: 'max-height .3s ease',
          }}>
            {MOTORS.map((motor) => (
              <div key={motor.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.22rem 1.25rem 0.22rem 1.75rem', fontSize: '0.6875rem', color: '#b3b3cc',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem' }}>{motor.icon}</span>
                  {motor.label}
                </span>
                <span style={{ fontSize: '0.85rem', lineHeight: 1, color: estado?.[motor.key] === 'done' ? '#3A9E5E' : estado?.[motor.key] === 'generating' ? '#f59e0b' : estado?.[motor.key] === 'error' ? '#ef4444' : '#b3b3cc' }}>
                  ○
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Health indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.45rem 1.25rem', fontSize: '0.6875rem',
          color: health.status === 'healthy' ? '#3A9E5E' : health.status === 'degraded' ? '#f59e0b' : '#ef4444',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: '0.6rem' }}>{health.status === 'healthy' ? '🟢' : health.status === 'degraded' ? '🟡' : '🔴'}</span>
          <span>{(health.status === 'healthy' ? 'Sistema operativo' : health.status === 'degraded' ? 'Sistema degradado' : 'Sistema no disponible')}</span>
        </div>

        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.55rem 1.25rem', fontSize: '0.8125rem',
            color: '#ef4444', cursor: 'pointer', transition: 'all .15s',
            borderLeft: '2px solid transparent',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#2e2f3e';
            (e.currentTarget as HTMLElement).style.color = '#f87171';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = '#ef4444';
          }}
        >
          <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>🧹</span>
          <span>Reiniciar Todo</span>
        </div>

        <div
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.55rem 1.25rem', fontSize: '0.8125rem',
            color: '#ef4444', cursor: 'pointer', transition: 'all .15s',
            borderLeft: '2px solid transparent',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#2e2f3e';
            (e.currentTarget as HTMLElement).style.color = '#f87171';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = '#ef4444';
          }}
        >
          <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', flexShrink: 0 }}>🚪</span>
          <span>Cerrar Sesión</span>
        </div>
      </div>
    </aside>
  );
}
