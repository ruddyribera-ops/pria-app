/**
 * ResultPreview — renders ANY phase result object as formatted rich content.
 * Replaces raw JSON.stringify() display for ALL motor types.
 *
 * Auto-detects structure: strings, arrays, objects with title/description,
 * special keys (objetivosBloom, preguntas, cards, materiales, etc.)
 * Renders them as cards, badges, lists, sections, or highlighted boxes.
 */

interface ResultPreviewProps {
  /** Phase result data (any shape from any motor type) */
  data: unknown;
  /** Optional title override */
  title?: string;
  /** Max items to show before collapsing */
  maxItems?: number;
}

export default function ResultPreview({ data, title, maxItems = 20 }: ResultPreviewProps) {
  if (data === null || data === undefined) {
    return <EmptyState />;
  }

  return (
    <div style={{ fontSize: '0.75rem', lineHeight: 1.5, color: '#1e1e2f' }}>
      {title && (
        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1e1e2f', marginBottom: '0.5rem' }}>
          {title}
        </div>
      )}
      <RenderValue value={data} depth={0} maxItems={maxItems} />
    </div>
  );
}

// ═══════════════════ Depth-Aware Renderer ═══════════════════

function RenderValue({ value, depth, maxItems }: { value: unknown; depth: number; maxItems: number }) {
  if (value === null || value === undefined) return <span style={{ color: '#b0b0c4' }}>—</span>;

  if (typeof value === 'string') {
    return <RenderString text={value} />;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return <RenderArray items={value} depth={depth} maxItems={maxItems} />;
  }

  if (typeof value === 'object') {
    return <RenderObject obj={value as Record<string, unknown>} depth={depth} maxItems={maxItems} />;
  }

  return <span>{String(value)}</span>;
}

// ═══════════════════ String Rendering ═══════════════════

function RenderString({ text }: { text: string }) {
  // Detect multi-line
  if (text.includes('\n')) {
    return (
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
        {text.split('\n').map((line, i, arr) => (
          <div key={line || `newline-${i}`} style={{ marginBottom: i < arr.length - 1 ? '0.25rem' : 0 }}>
            {formatInline(line)}
          </div>
        ))}
      </div>
    );
  }

  // Detect emoji-leading lines (activity titles etc)
  if (/^[🔵🟡🔴🎯📝💡🎮🏆⭐📋❓⚙️📚📅📊📌🔗🚀📦🧠]\s/.test(text)) {
    return <div style={{ marginBottom: '0.125rem' }}>{formatInline(text)}</div>;
  }

  // Short text
  if (text.length < 80) {
    return (
      <span>
        {text.startsWith('•') ? (
          <span style={{ color: '#3A9E5E', marginRight: '0.25rem' }}>•</span>
        ) : null}
        {formatInline(text)}
      </span>
    );
  }

  // Long text paragraph
  return (
    <div style={{ marginBottom: '0.375rem', lineHeight: 1.5, textAlign: 'justify' }}>
      {formatInline(text)}
    </div>
  );
}

/** Bold text between ** markers */
function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={part}>{part.slice(2, -2)}</strong>;
    }
    return <span key={part || `plain-${i}`}>{part}</span>;
  });
}

// ═══════════════════ Array Rendering ═══════════════════

function RenderArray({ items, depth, maxItems }: { items: unknown[]; depth: number; maxItems: number }) {
  if (items.length === 0) return <span style={{ color: '#b0b0c4' }}>Vacío</span>;

  const visible = items.slice(0, maxItems);
  const remaining = items.length - maxItems;

  // Detect array of strings
  if (items.every(item => typeof item === 'string')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {(items as string[]).map((item) => (
          <div key={item} style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#3A9E5E', fontSize: '0.625rem', marginTop: '0.25rem' }}>●</span>
            <RenderString text={item} />
          </div>
        ))}
      </div>
    );
  }

  // Detect array of objects with title/description pattern → cards
  const hasTitleDesc = items.some(
    item => typeof item === 'object' && item !== null && ('title' in item || 'titulo' in item || 'concepto' in item)
  );

  if (hasTitleDesc) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {visible.map((item, i) => {
          const obj = item as Record<string, unknown>;
          const title = (obj.title || obj.titulo || obj.concepto || obj.label || '') as string;
          const desc = (obj.description || obj.descripcion || obj.explicacion || '') as string;
          const icon = obj.icon as string || '';

          return (
            <div key={title || `card-${i}`} style={{
              padding: '0.5rem 0.625rem',
              background: '#f8f8ff',
              border: '1px solid #e6e6eb',
              borderRadius: '4px',
              borderLeft: `3px solid #3A9E5E`,
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.125rem' }}>
                {icon && <span style={{ marginRight: '0.25rem' }}>{icon}</span>}
                {formatInline(title)}
              </div>
              {desc && (
                <div style={{ fontSize: '0.6875rem', color: '#6b6b80', lineHeight: 1.4 }}>
                  <RenderString text={desc} />
                </div>
              )}
            </div>
          );
        })}
        {remaining > 0 && (
          <div style={{ fontSize: '0.6875rem', color: '#b0b0c4', textAlign: 'center' }}>
            +{remaining} más
          </div>
        )}
      </div>
    );
  }

  // Detect array of objects with `text` field → questions
  const hasText = items.some(item => typeof item === 'object' && item !== null && 'text' in item);
  if (hasText) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {visible.map((item, i) => {
          const obj = item as Record<string, unknown>;
          const qText = obj.text as string || '';
          const opts = obj.options as string[] | undefined;
          return (
            <div key={qText || `question-${i}`} style={{
              padding: '0.5rem 0.625rem',
              background: '#fff',
              border: '1px solid #e6e6eb',
              borderRadius: '4px',
            }}>
              <div style={{ fontWeight: 500, fontSize: '0.6875rem', marginBottom: opts ? '0.25rem' : 0 }}>
                {i + 1}. {formatInline(qText)}
              </div>
              {opts && opts.length > 0 && (
                <div style={{ marginLeft: '1rem', fontSize: '0.625rem', color: '#6b6b80' }}>
                  {opts.map((opt) => (
                    <div key={opt}>{String.fromCharCode(65 + opts.indexOf(opt))}) {opt}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Generic array rendering
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {visible.map((item, i) => (
        <div key={String(item) || `generic-${i}`} style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #e6e6eb' }}>
          <RenderValue value={item} depth={depth + 1} maxItems={maxItems} />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════ Object Rendering ═══════════════════

/** Known keys that should render as special visual elements */
const SPECIAL_KEYS: Record<string, { label: string; icon: string; color: string }> = {
  objetivo: { label: 'Objetivo', icon: '🎯', color: '#166534' },
  objetivoJuego: { label: 'Objetivo del Juego', icon: '🎯', color: '#166534' },
  reglas: { label: 'Reglas', icon: '📋', color: '#92400E' },
  puntuacion: { label: 'Puntuación', icon: '⭐', color: '#854D0E' },
  formacionEquipos: { label: 'Formación de Equipos', icon: '👥', color: '#1e1e2f' },
  materiales: { label: 'Materiales', icon: '📦', color: '#6b6b80' },
  competencias: { label: 'Competencias', icon: '🎯', color: '#166534' },
  conocimientosPrevios: { label: 'Conocimientos Previos', icon: '🧠', color: '#6b6b80' },
  criterios: { label: 'Criterios', icon: '📋', color: '#6b6b80' },
  instrumentos: { label: 'Instrumentos', icon: '📊', color: '#6b6b80' },
  tarea: { label: 'Tarea', icon: '📝', color: '#92400E' },
  diferenciacion: { label: 'Diferenciación', icon: '🔄', color: '#6b6b80' },
  inicio: { label: 'Inicio', icon: '🚀', color: '#3A9E5E' },
  desarrollo: { label: 'Desarrollo', icon: '📝', color: '#2563EB' },
  cierre: { label: 'Cierre', icon: '🎯', color: '#7C3AED' },
  desafios: { label: 'Desafíos', icon: '🏆', color: '#92400E' },
  bonus: { label: 'Bonus', icon: '💎', color: '#854D0E' },
  variantes: { label: 'Variantes', icon: '🔄', color: '#6b6b80' },
  semanas: { label: 'Distribución Semanal', icon: '📅', color: '#1e1e2f' },
  recursos: { label: 'Recursos', icon: '📚', color: '#6b6b80' },
  bibliografia: { label: 'Bibliografía', icon: '📖', color: '#6b6b80' },
  ejes: { label: 'Ejes Temáticos', icon: '📌', color: '#1e1e2f' },
  subTemas: { label: 'Sub-temas', icon: '🔗', color: '#6b6b80' },
  conexiones: { label: 'Conexiones', icon: '🔗', color: '#6b6b80' },
  contenidosGenerales: { label: 'Contenidos Generales', icon: '📚', color: '#1e1e2f' },
  indicadores: { label: 'Indicadores de Logro', icon: '📏', color: '#6b6b80' },
  adecuaciones: { label: 'Adecuaciones', icon: '🔄', color: '#6b6b80' },
  ejemplos: { label: 'Ejemplos', icon: '💡', color: '#6b6b80' },
  actividadesSugeridas: { label: 'Actividades Sugeridas', icon: '✏️', color: '#6b6b80' },
  contenidoExpandido: { label: 'Desarrollo', icon: '📝', color: '#1e1e2f' },
};

/** Keys that represent Bloom taxonomy objectives */
const BLOOM_KEYS = ['objetivosBloom', 'bloomObjectives', 'objetivos', 'objectives'];

/** Keys that represent concept lists */
const CONCEPT_KEYS = ['conceptosClave', 'conceptos', 'conceptosKey', 'concepts'];

/** Keys that represent copy-to-notebook boxes */
const COPY_KEYS = ['paraCopiar', 'copyBoxes'];

/** Keys that should display as tags/chips */
const TAG_KEYS = ['materiales', 'competencias', 'indicadores', 'recursos', 'contenidosGenerales', 'conocimientosPrevios'];

function RenderObject({ obj, depth, maxItems }: { obj: Record<string, unknown>; depth: number; maxItems: number }) {
  const entries = Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined);

  if (entries.length === 0) return <span style={{ color: '#b0b0c4' }}>—</span>;

  // ── Bloom objectives ──
  const bloomKey = entries.find(([k]) => BLOOM_KEYS.includes(k));
  if (bloomKey && Array.isArray(bloomKey[1])) {
    return <BloomList items={bloomKey[1] as string[]} />;
  }

  // ── Concepts → tags ──
  const conceptKey = entries.find(([k]) => CONCEPT_KEYS.includes(k));
  if (conceptKey && Array.isArray(conceptKey[1])) {
    return <TagList items={conceptKey[1] as string[]} color="#3A9E5E" />;
  }

  // ── Copy boxes ──
  const copyKey = entries.find(([k]) => COPY_KEYS.includes(k));
  if (copyKey && Array.isArray(copyKey[1])) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {(copyKey[1] as string[]).map((box) => (
          <CopyBox key={box} text={box} />
        ))}
      </div>
    );
  }

  // ── Single object with known structure ──
  // Check if it's a "wrapper" with a single meaningful key
  if (entries.length === 1 && typeof entries[0][1] === 'object' && !Array.isArray(entries[0][1])) {
    return <RenderValue value={entries[0][1]} depth={depth} maxItems={maxItems} />;
  }

  // ── Render each entry by its key type ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {entries.map(([key, value]: [string, unknown]) => {
        // Skip internal/ui keys
        if (key.startsWith('_') || key === 'id') return null;

        const special = SPECIAL_KEYS[key];

        // Tag-style keys
        if (TAG_KEYS.includes(key) && Array.isArray(value)) {
          return (
            <Section key={key} icon={special?.icon || '📌'} label={special?.label || formatKey(key)}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {(value as string[]).map((item) => (
                  <span key={item} style={{
                    padding: '0.125rem 0.5rem', background: '#e8f5e9',
                    borderRadius: '12px', fontSize: '0.6875rem',
                    color: '#166534', fontWeight: 500,
                  }}>
                    {item}
                  </span>
                ))}
              </div>
            </Section>
          );
        }

        // Concept keys
        if (CONCEPT_KEYS.includes(key) && Array.isArray(value)) {
          return (
            <Section key={key} icon="📌" label="Conceptos Clave">
              <TagList items={value as string[]} color="#3A9E5E" />
            </Section>
          );
        }

        // Bloom keys
        if (BLOOM_KEYS.includes(key) && Array.isArray(value)) {
          return <BloomList key={key} items={value as string[]} />;
        }

        // Copy keys
        if (COPY_KEYS.includes(key) && Array.isArray(value)) {
          return (
            <div key={key}>
              {(value as string[]).map((box) => (
                <CopyBox key={box} text={box} />
              ))}
            </div>
          );
        }

        // Special known keys
        if (special) {
          return (
            <Section key={key} icon={special.icon} label={special.label}>
              <RenderValue value={value} depth={depth + 1} maxItems={maxItems} />
            </Section>
          );
        }

        // Cards (array of structured objects)
        if (key === 'cards' && Array.isArray(value)) {
          return (
            <Section key={key} icon="📇" label="Contenido">
              <RenderArray items={value} depth={depth + 1} maxItems={maxItems} />
            </Section>
          );
        }

        // Activities
        if (key === 'actividades' && Array.isArray(value)) {
          return (
            <Section key={key} icon="✏️" label="Actividades">
              <RenderArray items={value} depth={depth + 1} maxItems={maxItems} />
            </Section>
          );
        }

        // Preguntas
        if (key === 'preguntas' && Array.isArray(value)) {
          return (
            <Section key={key} icon="❓" label="Preguntas">
              <RenderArray items={value} depth={depth + 1} maxItems={maxItems} />
            </Section>
          );
        }

        // Desafíos / bonus / variantes
        if (['desafios', 'bonus', 'variantes'].includes(key) && Array.isArray(value)) {
          const s = SPECIAL_KEYS[key];
          return (
            <Section key={key} icon={s?.icon || '📌'} label={s?.label || formatKey(key)}>
              <RenderArray items={value} depth={depth + 1} maxItems={maxItems} />
            </Section>
          );
        }

        // String values → labeled field
        if (typeof value === 'string') {
          const s = SPECIAL_KEYS[key];
          return (
            <div key={key} style={{ marginBottom: '0.25rem' }}>
              {!isGenericKey(key) && (
                <div style={{ fontSize: '0.625rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', marginBottom: '0.125rem', letterSpacing: '0.04em' }}>
                  {s?.icon || ''} {s?.label || formatKey(key)}
                </div>
              )}
              <RenderString text={value} />
            </div>
          );
        }

        // Number/boolean values
        if (typeof value === 'number' || typeof value === 'boolean') {
          return (
            <div key={key} style={{ marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', marginRight: '0.375rem' }}>
                {formatKey(key)}:
              </span>
              <span>{String(value)}</span>
            </div>
          );
        }

        // Array values → nested
        if (Array.isArray(value)) {
          return (
            <div key={key}>
              {value.length > 0 && (
                <div style={{ fontSize: '0.625rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                  {formatKey(key)}
                </div>
              )}
              <RenderArray items={value} depth={depth + 1} maxItems={maxItems} />
            </div>
          );
        }

        // Object values → nested
        if (typeof value === 'object' && value !== null) {
          return (
            <div key={key}>
              {!isGenericKey(key) && entries.length > 1 && (
                <div style={{ fontSize: '0.625rem', fontWeight: 600, color: '#6b6b80', textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                  {formatKey(key)}
                </div>
              )}
              <RenderObject obj={value as Record<string, unknown>} depth={depth + 1} maxItems={maxItems} />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// ═══════════════════ Sub-Components ═══════════════════

function Section({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: '0.6875rem', fontWeight: 600, color: '#1e1e2f',
        marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
      }}>
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

function BloomList({ items }: { items: string[] }) {
  const BLOOM_COLORS = ['#3A9E5E', '#2563EB', '#7C3AED', '#D97706', '#DC2626', '#0891B2'];
  const BLOOM_LABELS = ['Recordar', 'Comprender', 'Aplicar', 'Analizar', 'Evaluar', 'Crear'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {items.map((item, i) => {
        const color = BLOOM_COLORS[Math.min(i, BLOOM_COLORS.length - 1)];
        const level = BLOOM_LABELS[Math.min(i, BLOOM_LABELS.length - 1)];
        return (
          <div key={item} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.375rem 0.5rem', background: '#f8f8ff',
            borderRadius: '4px', border: '1px solid #e6e6eb',
          }}>
            <div style={{
              width: '1.25rem', height: '1.25rem', borderRadius: '50%',
              background: color, color: '#fff', fontSize: '0.625rem',
              fontWeight: 700, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <span style={{
              padding: '0.0625rem 0.375rem', borderRadius: '3px',
              background: `${color}18`, color, fontSize: '0.625rem',
              fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {level}
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#1e1e2f', lineHeight: 1.3 }}>
              {item}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
      {items.map((item) => (
        <span key={item} style={{
          padding: '0.125rem 0.5rem', background: `${color}12`,
          borderRadius: '12px', fontSize: '0.6875rem',
          color, fontWeight: 500, border: `1px solid ${color}30`,
        }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function CopyBox({ text }: { text: string }) {
  return (
    <div style={{
      padding: '0.5rem 0.625rem', background: '#FFFBEB',
      border: '1px solid #F59E0B', borderRadius: '4px',
      fontSize: '0.6875rem', color: '#92400E', lineHeight: 1.4,
      whiteSpace: 'pre-wrap',
    }}>
      <span style={{ fontWeight: 600 }}>📝 </span>
      {text}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      padding: '1rem', textAlign: 'center', color: '#b0b0c4',
      fontSize: '0.75rem',
    }}>
      Sin resultados
    </div>
  );
}

// ═══════════════════ Helpers ═══════════════════

/**
 * Keys that are too generic to show as labels
 * (they're usually wrapper objects or metadata)
 */
const GENERIC_KEYS = new Set([
  'id', 'type', '_phase', '_type', 'data', 'result',
  'config', 'meta', 'info', 'datos', 'contexto_anterior', 'fase',
]);

function isGenericKey(key: string): boolean {
  return GENERIC_KEYS.has(key);
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}
