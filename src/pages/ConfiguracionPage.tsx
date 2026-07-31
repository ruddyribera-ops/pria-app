import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/UI/Toast';
import styles from './ConfiguracionPage.module.css';

/** Local-storage backed Nivel / Grado selector (moved from sidebar). */
function NivelGradoSelector() {
  const [nivel, setNivel] = useState(() => localStorage.getItem('pria_nivel') || 'Primaria');
  const [grado, setGrado] = useState(() => localStorage.getItem('pria_grado') || '5to primaria');

  const handleNivelChange = (n: string) => {
    setNivel(n);
    localStorage.setItem('pria_nivel', n);
  };

  const handleGradoChange = (g: string) => {
    setGrado(g);
    localStorage.setItem('pria_grado', g);
  };

  return (
    <div className={styles.nivelSelector}>
      <div className={styles.nivelRow}>
        <label className={styles.nivelLabel} htmlFor="cfg-nivel">Nivel:</label>
        <select
          id="cfg-nivel"
          className={styles.nivelSelect}
          value={nivel}
          onChange={(e) => handleNivelChange(e.target.value)}
        >
          <option>Primaria</option>
          <option>Secundaria</option>
        </select>
      </div>
      <div className={styles.nivelRow}>
        <label className={styles.nivelLabel} htmlFor="cfg-grado">Grado:</label>
        <select
          id="cfg-grado"
          className={styles.nivelSelect}
          value={grado}
          onChange={(e) => handleGradoChange(e.target.value)}
        >
          <option>5to primaria</option>
          <option>4to primaria</option>
          <option>3ro primaria</option>
          <option>2do primaria</option>
          <option>1ro primaria</option>
        </select>
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Welcome toast on first visit
  useEffect(() => {
    showToast?.('Configuración — ajusta tu nivel y grado aquí', 'info');
  }, [showToast]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>⚙️ Configuración</h1>
        <p className={styles.subtitle}>Tu cuenta, nivel educativo y acceso rápido a herramientas</p>
      </header>

      {/* Profile section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>👤 Tu cuenta</h2>
        <div className={styles.row}>
          <span className={styles.label}>Nombre</span>
          <span className={styles.value}>{user?.nombre || '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Rol</span>
          <span className={styles.value}>{user?.role === 'admin' ? 'Administrador' : 'Docente'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Código</span>
          <span className={styles.value}>{user?.teacher_code || '—'}</span>
        </div>
      </section>

      {/* Nivel / Grado selector */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🎓 Nivel educativo</h2>
        <p className={styles.helpText}>
          Estos ajustes determinan los parámetros que PRIA usa al generar materiales.
        </p>
        <NivelGradoSelector />
      </section>

      {/* Materiales library — link */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📚 Materiales</h2>
        <p className={styles.helpText}>
          Gestiona tus libros de texto y consulta los materiales subidos.
        </p>
        <Link to="/materiales" className={styles.linkButton}>
          Ir a Materiales →
        </Link>
      </section>

      {/* Diagnosticos — link */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🩺 Diagnósticos</h2>
        <p className={styles.helpText}>
          Sube los diagnósticos de tus estudiantes para adaptar los materiales.
        </p>
        <Link to="/diagnosticos" className={styles.linkButton}>
          Ir a Diagnósticos →
        </Link>
      </section>

      {/* Logout */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🚪 Sesión</h2>
        <p className={styles.helpText}>Cierra tu sesión actual.</p>
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </section>
    </div>
  );
}
