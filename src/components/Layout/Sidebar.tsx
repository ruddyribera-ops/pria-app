import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEstadoSistema } from '../../hooks/useAdmin';
import { MOTORS } from '../../api/admin';
import styles from './Sidebar.module.css';

interface SidebarProps {
  nivel: string;
  grado: string;
  onNivelChange: (n: string) => void;
  onGradoChange: (g: string) => void;
}

export default function Sidebar({ nivel, grado, onNivelChange, onGradoChange }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: estadoData } = useEstadoSistema();
  const motors = estadoData?.motors ?? {};

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
      {/* Mobile hamburger */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={mobileOpen}
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={closeMobile}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
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

        {/* User Profile */}
        <div
          className={styles.profile}
          onClick={() => setProfileOpen(!profileOpen)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setProfileOpen(!profileOpen)}
          aria-expanded={profileOpen}
          aria-label="Perfil de usuario"
        >
          <div className={styles.profileAvatar}>{initials}</div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>
              {user?.nombre || 'Usuario'}{' '}
              <span className={`${styles.profileChevron} ${profileOpen ? styles.profileChevronOpen : ''}`}>▼</span>
            </div>
            <div className={styles.profileRole}>
              👑 {user?.role === 'admin' ? 'Administrador' : 'Docente'} · {user?.nombre || ''}
            </div>
          </div>

          {/* Profile dropdown */}
          {profileOpen && (
            <div className={styles.profileDropdown} onClick={(e) => e.stopPropagation()}>
              <div className={styles.dropdownItem}>
                <div className={styles.dropdownLabel}>Nombre</div>
                <div className={styles.dropdownValue}>{user?.nombre}</div>
              </div>
              <div className={styles.dropdownItem}>
                <div className={styles.dropdownLabel}>Rol</div>
                <div className={styles.dropdownValue}>{user?.role}</div>
              </div>
              <div className={styles.dropdownDivider} />
              <div
                className={styles.dropdownLogout}
                onClick={handleLogout}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleLogout()}
              >
                🚪 Cerrar Sesión
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {/* Section: Generación */}
          <div className={styles.navSection}>🎨 Generación</div>
          <NavLink
            to="/slides"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            onClick={closeMobile}
          >
            <span className={styles.navIcon}>🖼️</span>
            <span>Diapositivas</span>
          </NavLink>

          {/* Section: Planificación */}
          <div className={styles.navSection}>📅 Planificación</div>
          <NavLink
            to="/diario"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            onClick={closeMobile}
          >
            <span className={styles.navIcon}>🌅</span>
            <span>Diario</span>
          </NavLink>
          <NavLink
            to="/semanal"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            onClick={closeMobile}
          >
            <span className={styles.navIcon}>📅</span>
            <span>Semanal</span>
          </NavLink>
          <NavLink
            to="/trimestral"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            onClick={closeMobile}
          >
            <span className={styles.navIcon}>📆</span>
            <span>Trimestral</span>
          </NavLink>

          {/* Section: Recursos */}
          <div className={styles.navSection}>📦 Recursos</div>
          <NavLink
            to="/materiales"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            onClick={closeMobile}
          >
            <span className={styles.navIcon}>📚</span>
            <span>Materiales</span>
          </NavLink>
          <NavLink
            to="/historial"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            onClick={closeMobile}
          >
            <span className={styles.navIcon}>📁</span>
            <span>Historial</span>
          </NavLink>
          <NavLink
            to="/diagnosticos"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            onClick={closeMobile}
          >
            <span className={styles.navIcon}>🩺</span>
            <span>Diagnósticos</span>
          </NavLink>

          {/* Section: Administración (solo admin) */}
          {isAdmin && (
            <>
              <div className={styles.navSection}>⚙️ Administración</div>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
                onClick={closeMobile}
              >
                <span className={styles.navIcon}>⚙️</span>
                <span>Panel Admin</span>
              </NavLink>
            </>
          )}

          {/* Nivel Educativo */}
          <div className={styles.nivelSelector}>
            <div className={styles.nivelSelectorLabel}>🎓 Nivel Educativo</div>
            <div className={styles.nivelRow}>
              <label className={styles.nivelLabel} htmlFor="nivel-select">Nivel:</label>
              <select
                id="nivel-select"
                className={styles.nivelSelect}
                value={nivel}
                onChange={(e) => onNivelChange(e.target.value)}
              >
                <option>Primaria</option>
                <option>Secundaria</option>
              </select>
            </div>
            <div className={styles.nivelRow}>
              <label className={styles.nivelLabel} htmlFor="grado-select">Grado:</label>
              <select
                id="grado-select"
                className={styles.nivelSelect}
                value={grado}
                onChange={(e) => onGradoChange(e.target.value)}
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
        <div className={styles.footer}>
          {/* Estado del Sistema */}
          <div className={styles.estadoSection}>
            <EstadoToggle motors={motors} />
          </div>

          {/* Health indicator */}
          <div className={styles.healthIndicator}>
            <span>🟢</span>
            <span>Sistema operativo</span>
          </div>

          <div
            className={styles.actionButton}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleLogout()}
            onClick={handleLogout}
          >
            <span className={styles.navIcon}>🚪</span>
            <span>Cerrar Sesión</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function EstadoToggle({ motors }: { motors: Record<string, string> }) {
  const [estadoOpen, setEstadoOpen] = useState(false);

  return (
    <>
      <div
        className={styles.estadoToggle}
        onClick={() => setEstadoOpen(!estadoOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setEstadoOpen(!estadoOpen)}
        aria-expanded={estadoOpen}
        aria-label="Estado del sistema"
      >
        <span>📊 Estado del Sistema</span>
        <span className={`${styles.estadoChevron} ${estadoOpen ? styles.estadoChevronOpen : ''}`}>▶</span>
      </div>
      <div className={`${styles.estadoContent} ${estadoOpen ? styles.estadoContentOpen : ''}`}>
        {MOTORS.map((motor) => (
          <div key={motor.key} className={styles.estadoRow}>
            <span className={styles.estadoLabel}>
              <span className={styles.estadoIcon}>{motor.icon}</span>
              {motor.label}
            </span>
            <span
              className={`${styles.estadoDot} ${
                motors[motor.key] === 'done'
                  ? styles.dotDone
                  : motors[motor.key] === 'generating'
                  ? styles.dotGenerating
                  : motors[motor.key] === 'error'
                  ? styles.dotError
                  : styles.dotIdle
              }`}
            >
              ○
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
