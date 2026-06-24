// Client-side fidelity validator — mirrors server logic for real-time validation
// Used during inline editing to give instant feedback

export interface ClientFidelityWarning {
  slide_number?: number;
  severity: 'HIGH' | 'MEDIUM';
  category: string;
  flagged_text: string;
  reason: string;
  suggestion: string;
}

export interface ClientFidelityReport {
  score: number;
  total_flags: number;
  warnings: ClientFidelityWarning[];
}

const HIGH_RISK_PATTERNS: Array<{ pattern: RegExp; category: string; reason: string; suggestion: string }> = [
  {
    pattern: /\bmujer\s+sabia\b/gi,
    category: 'rol_inventado',
    reason: '"mujer sabia" no aparece en el texto fuente',
    suggestion: 'Si el rol no está en la fuente, usa solo el nombre o elimina la caracterización.',
  },
  {
    pattern: /\b(arcilla|barro|tierra\s+de\s+colores)\b/gi,
    category: 'material_inventado',
    reason: 'Material específico no mencionado en la fuente',
    suggestion: 'Reemplazar con "materiales de la naturaleza" o eliminar.',
  },
  {
    pattern: /\b(jaguar|jaguars)\b/gi,
    category: 'animal_inventado',
    reason: 'Animal específico (jaguar) no mencionado en la fuente',
    suggestion: 'Usar "los animales" o solo mencionar animales del texto.',
  },
  {
    pattern: /\b(lapa|lapas)\b/gi,
    category: 'animal_inventado',
    reason: 'Animal específico (lapa) no mencionado en la fuente',
    suggestion: 'Usar "los animales" o solo mencionar animales del texto.',
  },
  {
    pattern: /\b(loro|loros)\b/gi,
    category: 'animal_inventado',
    reason: 'Animal específico (loro) no mencionado en la fuente',
    suggestion: 'Usar "los animales" o solo mencionar animales del texto.',
  },
  {
    pattern: /\b(venado|ardilla|zorro|mono|puma|condor|pájaro)\b/gi,
    category: 'animal_inventado',
    reason: 'Animal específico no mencionado en la fuente',
    suggestion: 'Verificar si este animal está en el texto fuente.',
  },
  {
    pattern: /\bmanchas?\s+negras?\b/gi,
    category: 'color_inventado',
    reason: 'Color específico (manchas negras) no mencionado en la fuente',
    suggestion: 'Usar "diferentes colores" o generalizar.',
  },
  {
    pattern: /\bplumas?\s+(naranjas?|verdes?\s+y\s+rojas?|multicolores?|rojas?|azules?)\b/gi,
    category: 'color_inventado',
    reason: 'Color específico de plumas no mencionado en la fuente',
    suggestion: 'Usar lenguaje genérico sobre colores.',
  },
  {
    pattern: /\brío\s+Parapetí\b/gi,
    category: 'lugar_inventado',
    reason: 'Nombre propio de lugar no verificado en la fuente',
    suggestion: 'Usar "un río" o verificar el nombre.',
  },
  {
    pattern: /\bcreador(a)?\s+(del?\s+pueblo|de\s+los\s+animales)\b/gi,
    category: 'rol_inventado',
    reason: 'Rol específico no mencionado en la fuente',
    suggestion: 'Solo asignar roles que aparezcan explícitamente en el texto.',
  },
  {
    pattern: /\bel\s+sol\s+(envió|mandó|delegó|envío)\b/gi,
    category: 'accion_inventada',
    reason: 'Acción específica del Sol no mencionada en la fuente',
    suggestion: 'Solo mencionar lo que el texto dice sobre el Sol.',
  },
  {
    pattern: /\bguede\s+(decidió|eligió|quiso|tuvo\s+la\s+idea|decide)\b/gi,
    category: 'motivacion_inventada',
    reason: 'Motivación específica de Guede no mencionada en la fuente',
    suggestion: 'Solo describir lo que la fuente dice explícitamente.',
  },
  {
    pattern: /\btomó\s+(arcilla|del\s+río|agua)\b/gi,
    category: 'accion_inventada',
    reason: 'Acción específica no mencionada en la fuente',
    suggestion: 'Solo describir acciones del texto.',
  },
  {
    pattern: /\b(dios|diosa|divinidad)\b/gi,
    category: 'rol_inventado',
    reason: 'Término religioso no mencionado en la fuente',
    suggestion: 'Solo usar si el texto lo menciona.',
  },
];

export interface SlideForValidation {
  numero?: number;
  titulo?: string;
  texto_pantalla?: string;
  guion_docente?: string;
  callout?: string;
}

/**
 * Quick client-side fidelity check — runs in <10ms for instant feedback during editing.
 * Only checks HIGH risk patterns. Server does full check on save.
 */
export function validateSlidesClient(
  slides: SlideForValidation[],
  fullText: string
): ClientFidelityReport {
  if (!fullText || fullText.length < 10) {
    return { score: 100, total_flags: 0, warnings: [] };
  }

  const sourceTextLower = fullText.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const warnings: ClientFidelityWarning[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  slides.forEach(slide => {
    const text = `${slide.titulo || ''} ${slide.texto_pantalla || ''} ${slide.guion_docente || ''} ${slide.callout || ''}`;
    const textLower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    HIGH_RISK_PATTERNS.forEach(({ pattern, category, reason, suggestion }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const matchLower = match.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (!sourceTextLower.includes(matchLower)) {
            totalChecks++;
            warnings.push({
              slide_number: slide.numero,
              severity: 'HIGH',
              category,
              flagged_text: match,
              reason,
              suggestion,
            });
          } else {
            passedChecks++;
          }
        });
      }
    });
  });

  const score = totalChecks === 0 ? 100 : Math.max(0, 100 - (totalChecks - passedChecks) * 15);
  return {
    score,
    total_flags: warnings.length,
    warnings,
  };
}

/**
 * Apply a correction to all flagged slides at once.
 * Example: Remove all mentions of "mujer sabia" from a flagged slide.
 */
export function applyBulkCorrection(
  slides: SlideForValidation[],
  find: string | RegExp,
  replace: string
): SlideForValidation[] {
  return slides.map(slide => {
    const applyToField = (val: string | undefined): string | undefined => {
      if (!val) return val;
      if (typeof find === 'string') {
        return val.split(find).join(replace);
      } else {
        return val.replace(find, replace);
      }
    };
    return {
      ...slide,
      titulo: applyToField(slide.titulo),
      texto_pantalla: applyToField(slide.texto_pantalla),
      guion_docente: applyToField(slide.guion_docente),
      callout: applyToField(slide.callout),
    };
  });
}
