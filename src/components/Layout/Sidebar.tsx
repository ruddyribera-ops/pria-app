import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📚', label: 'Inicio' },
  { to: '/wizard', icon: '➕', label: 'Crear Material' },
  { to: '/historial', icon: '📁', label: 'Historial' },
  { to: '/configuracion', icon: '⚙️', label: 'Configuración' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.nombre
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(true)}
        type="button"
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {mobileOpen && (
        <div className={styles.overlay} onClick={closeMobile} role="presentation" />
      )}

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandInner}>
            <div className={styles.brandLogo}>PR</div>
            <div>
              PRIA <span className={styles.brandVersion}>v10</span>
            </div>
          </div>
        </div>

        {/* Profile — compact, click navigates to config */}
        <NavLink to="/configuracion" className={styles.profile} onClick={closeMobile}>
          <div className={styles.profileAvatar}>{initials}</div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{user?.nombre || 'Usuario'}</div>
            <div className={styles.profileRole}>
              {user?.role === 'admin' ? 'Administrador' : 'Docente'}
            </div>
          </div>
        </NavLink>

        {/* Navigation */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
              onClick={closeMobile}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Admin-only link */}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `${styles.navLink} ${styles.navLinkAdmin} ${isActive ? styles.navLinkActive : ''}`
              }
              onClick={closeMobile}
            >
              <span className={styles.navIcon}>🛡️</span>
              <span>Panel Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Logout at bottom — icon label */}
        <div className={styles.spacer} />
        <button
          className={styles.logoutButton}
          onClick={handleLogout}
          type="button"
          aria-label="Cerrar sesión"
        >
          <span className={styles.navIcon}>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </aside>
    </>
  );
}
