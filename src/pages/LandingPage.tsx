import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LandingPage.module.css';

/* ---------- Data ---------- */

const STATS = [
  { value: '13', label: 'motores IA' },
  { value: '~5 min', label: 'por clase completa' },
  { value: 'DUA', label: 'adaptaciones neurodiversas' },
  { value: '0–100', label: 'puntaje de calidad' },
];

const OUTPUTS = [
  { icon: '📋', name: 'Plan de Clase', format: 'DOCX' },
  { icon: '🖥️', name: 'Diapositivas', format: 'PPTX' },
  { icon: '📊', name: 'Evaluación', format: 'PDF' },
  { icon: '🎮', name: 'Ficha Gamificada', format: 'PDF' },
  { icon: '❓', name: 'Pop Quiz', format: 'PDF' },
  { icon: '👤', name: 'Guía del Tutor', format: 'DOCX' },
];

const REGIONS = ['Gran Chaco', 'Altiplano', 'Amazonía', 'Tierras Bajas'];
const INDIGENOUS = ['Ayoreo', 'Quechua', 'Aymara', 'Guaraní', 'Chiquitano', 'Mojeño'];

const DUA_CARDS = [
  {
    icon: '🧠',
    title: 'TDAH',
    body: 'Texto conciso, pausas de movimiento, ejemplos cortos. PRIA recorta la densidad y divide en bloques breves.',
  },
  {
    icon: '🧩',
    title: 'TEA',
    body: 'Apoyos visuales, estructura predecible, instrucciones explícitas. Reduce ambigüedad y sorpresas.',
  },
  {
    icon: '📖',
    title: 'Dislexia',
    body: 'Fuente OpenDyslexic, espaciado amplio, sin texto invertido. Prioriza legibilidad tipográfica.',
  },
];

const FLAGS = [
  { icon: '✅', text: 'Alineación curricular — 92/100', className: styles.flagOk },
  { icon: '✅', text: 'Sensibilidad cultural — 88/100', className: styles.flagOk },
  { icon: '⚠️', text: 'Densidad de texto en slide 4 — revisar', className: styles.flagWarn },
];

const MOTORS = [
  { icon: '💡', name: 'Síntesis Curricular', desc: 'Condensa el currículo oficial en objetivos accionables.' },
  { icon: '🎯', name: 'Proyecto ABP', desc: 'Diseña proyectos de aprendizaje basados en problemas.' },
  { icon: '📊', name: 'Evaluación', desc: 'Genera rúbricas y criterios alineados al objetivo.' },
  { icon: '📋', name: 'Plan de Clase', desc: 'Estructura la sesión con secuencia didáctica completa.' },
  { icon: '🖥️', name: 'Diapositivas', desc: 'Crea presentaciones visuales listas para proyectar.' },
  { icon: '🎮', name: 'Ficha Gamificada', desc: 'Transforma contenido en retos y juegos didácticos.' },
  { icon: '❓', name: 'Pop Quiz', desc: 'Cuestionarios rápidos de verificación de comprensión.' },
  { icon: '👤', name: 'Guía del Tutor', desc: 'Orienta al tutor sobre cómo conducir la sesión.' },
  { icon: '📅', name: 'PDC Trimestral', desc: 'Planifica un trimestre completo y coherente.' },
  { icon: '🔄', name: 'Recalibración', desc: 'Ajusta materiales según resultados y feedback.' },
  { icon: '🎓', name: 'Micro-Objetivos', desc: 'Descompone objetivos en metas micro alcanzables.' },
  { icon: '📄', name: 'Extracción de Currículo', desc: 'Extrae la estructura del documento fuente.' },
  { icon: '🎨', name: 'Source Narrator', desc: 'Narra el contenido fuente con coherencia pedagógica.' },
];

const EDITOR_BULLETS = [
  'Edición inline de texto en cada slide',
  'Agregar o eliminar diapositivas',
  'Regenerar slide individual con feedback',
  'Prompts de imagen (copia a Bing / Leonardo / Ideogram)',
];

/* ---------- Auth-aware CTA ---------- */

function CtaButtons({ variant }: { variant: 'hero' | 'header' | 'final' }) {
  const { isAuthenticated } = useAuth();
  const label = isAuthenticated ? 'Continuar al dashboard' : 'Empezar gratis';
  const to = isAuthenticated ? '/dashboard' : '/login';

  if (variant === 'header') {
    return (
      <Link to={to} className={styles.headerCta}>
        {label}
      </Link>
    );
  }

  if (variant === 'final') {
    return (
      <Link to={to} className={styles.finalCtaBtn}>
        {label}
      </Link>
    );
  }

  // hero
  return (
    <div className={styles.ctaRow}>
      <Link to={to} className={styles.btnPrimary}>
        {label}
      </Link>
      <a href="#motores" className={styles.btnOutline}>
        Ver demo
      </a>
      {!isAuthenticated && (
        <span className={styles.trustLine}>Sin tarjeta de crédito · Demo lista para usar</span>
      )}
    </div>
  );
}

/* ---------- Page ---------- */

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* 1. Sticky header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoCircle}>PR</span>
            <span className={styles.logoText}>
              <span className={styles.logoTitle}>PRIA v10</span>
              <span className={styles.logoTagline}>Planificación docente con IA</span>
            </span>
          </Link>
          <nav className={styles.nav}>
            <a href="#como-funciona" className={styles.navLink}>Cómo funciona</a>
            <a href="#motores" className={styles.navLink}>Motores</a>
            <a href="#caracteristicas" className={styles.navLink}>Características</a>
          </nav>
          <CtaButtons variant="header" />
        </div>
      </header>

      {/* 2. Hero */}
      <section className={`${styles.section} ${styles.hero}`} id="como-funciona">
        <span className={styles.badge}>✨ Hecho para Bolivia 🇧🇴 — Planificación docente con IA</span>
        <h1 className={styles.h1}>
          De un documento
          <br />
          <span className={styles.h1Gradient}>a una clase completa.</span>
        </h1>
        <p className={styles.subtitle}>
          Sube un capítulo de libro y PRIA extrae el contenido, lo estructura y genera plan de
          clase, diapositivas, evaluación, fichas y más — con sensibilidad cultural boliviana y
          adaptaciones DUA integradas.
        </p>
        <CtaButtons variant="hero" />
        <div className={styles.statsRow}>
          {STATS.map((s) => (
            <div className={styles.statItem} key={s.label}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Visual flow */}
      <section className={`${styles.sectionFull} ${styles.flowSection}`}>
        <div className={styles.section} style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className={styles.flow}>
            <div className={styles.sourceCard}>
              <div className={styles.sourceIcon}>📄</div>
              <div className={styles.sourceFile}>capitulo.pdf</div>
              <div className={styles.sourceLabel}>documento fuente</div>
            </div>
            <div className={styles.flowArrow}>↓</div>
            <div className={styles.outputStack}>
              {OUTPUTS.map((o) => (
                <div className={styles.outputCard} key={o.name}>
                  <span className={styles.outputIcon}>{o.icon}</span>
                  <span className={styles.outputName}>{o.name}</span>
                  <span className={styles.outputFormat}>{o.format}</span>
                  <span className={styles.outputDownload} aria-hidden>↓</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Cultural sensitivity */}
      <section className={`${styles.sectionFull} ${styles.cultural}`} id="caracteristicas">
        <div className={styles.section} style={{ paddingTop: 0, paddingBottom: 0 }}>
          <h2 className={styles.sectionHeading}>🌎 Sensibilidad cultural automática</h2>
          <p className={styles.sectionSubtitle}>
            PRIA detecta cuando tu contenido involucra pueblos originarios y adapta imágenes,
            ejemplos y contexto a la región. Hecho para Bolivia, no un LLM genérico.
          </p>
          <div className={styles.chipLabel}>Regiones</div>
          <div className={styles.chipRow}>
            {REGIONS.map((r) => (
              <span className={`${styles.chip} ${styles.chipWarm}`} key={r}>{r}</span>
            ))}
          </div>
          <div className={styles.chipLabel}>Pueblos originarios</div>
          <div className={styles.chipRow}>
            {INDIGENOUS.map((g) => (
              <span className={`${styles.chip} ${styles.chipWarm}`} key={g}>{g}</span>
            ))}
          </div>
        </div>
      </section>

      {/* 5. DUA / Neurodiverse */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>♿ Adaptaciones DUA integradas</h2>
        <p className={styles.sectionSubtitle}>
          Sube diagnósticos de tus estudiantes y PRIA adapta automáticamente: texto más corto para
          TDAH, apoyos visuales para TEA, fuente legible para Dislexia.
        </p>
        <div className={styles.cardGrid3}>
          {DUA_CARDS.map((c) => (
            <div className={styles.featureCard} key={c.title}>
              <div className={styles.featureIcon}>{c.icon}</div>
              <h3 className={styles.featureTitle}>{c.title}</h3>
              <p className={styles.featureBody}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Quality scoring */}
      <section className={`${styles.sectionFull} ${styles.flowSection}`}>
        <div className={styles.section} style={{ paddingTop: 0, paddingBottom: 0 }}>
          <h2 className={styles.sectionHeading}>📊 Calidad medible, no improvisada</h2>
          <p className={styles.sectionSubtitle}>
            Cada material generado recibe un puntaje 0–100 con flags accionables. Si la calidad es
            baja, PRIA te avisa antes de descargar.
          </p>
          <div className={styles.qualityWrap}>
            <div className={styles.qualityBadge}>
              <div className={styles.qualityScore}>85</div>
              <div className={styles.qualityLabel}>/ 100</div>
            </div>
            <ul className={styles.flagList}>
              {FLAGS.map((f) => (
                <li className={styles.flagItem} key={f.text}>
                  <span className={`${styles.flagIcon} ${f.className}`}>{f.icon}</span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 7. 13 Motors */}
      <section className={styles.section} id="motores">
        <h2 className={styles.sectionHeading}>13 motores de IA educativa</h2>
        <p className={styles.sectionSubtitle}>
          Cada motor hace una sola cosa muy bien. Úsalos en conjunto para generar una clase
          completa, o individualmente cuando solo necesitas un material.
        </p>
        <div className={styles.motorsGrid}>
          {MOTORS.map((m, i) => (
            <div className={styles.motorCard} key={m.name}>
              <div className={styles.motorNumber}>Motor {String(i + 1).padStart(2, '0')}</div>
              <div className={styles.motorIcon}>{m.icon}</div>
              <h3 className={styles.motorName}>{m.name}</h3>
              <p className={styles.motorDesc}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Editor highlight */}
      <section className={`${styles.sectionFull} ${styles.flowSection}`}>
        <div className={styles.section} style={{ paddingTop: 0, paddingBottom: 0 }}>
          <h2 className={styles.sectionHeading}>✏️ Edita antes de descargar</h2>
          <p className={styles.sectionSubtitle}>
            Como Chalkie AI: edita texto inline, agrega o elimina diapositivas, regenera UNA slide
            con feedback ('más simple', 'más divertido'), cambia el tema visual. Todo antes de
            descargar el PPTX.
          </p>
          <div className={styles.bulletGrid}>
            {EDITOR_BULLETS.map((b) => (
              <div className={styles.bullet} key={b}>
                <span className={styles.bulletCheck}>✓</span>
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className={`${styles.sectionFull} ${styles.finalCta}`}>
        <h2 className={styles.finalCtaHeading}>¿Listo para planificar tu próxima clase?</h2>
        <p className={styles.finalCtaSub}>Empieza gratis. Sin tarjeta de crédito.</p>
        <CtaButtons variant="final" />
      </section>

      {/* 10. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLine}>© 2026 PRIA · Método Palma-Ribera</div>
        <div className={styles.footerLine}>Hecho en Bolivia 🇧🇴</div>
      </footer>
    </div>
  );
}
