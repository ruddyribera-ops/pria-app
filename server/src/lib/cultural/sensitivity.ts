/**
 * Cultural sensitivity service for indigenous content detection.
 * Lightweight regex-based detection — runs synchronously, < 5ms.
 */

// Indigenous groups (Bolivia-specific, case-insensitive)
const INDIGENOUS_GROUPS = [
  'ayoreo', 'ayoré', 'chiquitano', 'mojeño', 'guaraní', 'quechua',
  'aymara', 'moxeño', 'ignaciano', 'tacana', 'tanimbu', 'baure',
  'chaco', 'ché guazú',
];

// Regions
const REGIONS = [
  'gran chaco', 'chaco', 'altiplano', 'amazonía', 'amazonia',
  'tierras bajas', 'valle', 'sierra',
];

// Cultural context keywords
const CULTURAL_CONTEXT = [
  'mito', 'leyenda', 'pueblo indígena', 'pueblo originário',
  'comunidad', 'originario', 'taywa',
];

/**
 * Detects if content mentions indigenous groups, regions, or cultural context.
 * Scans: tema_clase, full_text, unidad_nombre
 */
export function detectIndigenousContext(params: Record<string, unknown>): {
  detected: boolean;
  groups: string[];
  regions: string[];
  matchedTerms: string[];
} {
  const textToScan = [
    params.tema_clase,
    params.full_text,
    params.unidad_nombre,
  ]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();

  const matchedTerms: string[] = [];

  // Detect groups
  const detectedGroups = INDIGENOUS_GROUPS.filter((group) => {
    const regex = new RegExp(`\\b${group}\\b`, 'i');
    if (regex.test(textToScan)) {
      matchedTerms.push(group);
      return true;
    }
    return false;
  });

  // Detect regions
  const detectedRegions = REGIONS.filter((region) => {
    const regex = new RegExp(region, 'i');
    if (regex.test(textToScan)) {
      matchedTerms.push(region);
      return true;
    }
    return false;
  });

  // Detect cultural context
  const detectedContext = CULTURAL_CONTEXT.filter((ctx) => {
    const regex = new RegExp(ctx, 'i');
    if (regex.test(textToScan)) {
      matchedTerms.push(ctx);
      return true;
    }
    return false;
  });

  const detected = detectedGroups.length > 0 || detectedRegions.length > 0 || detectedContext.length > 0;

  return {
    detected,
    groups: detectedGroups,
    regions: detectedRegions,
    matchedTerms,
  };
}

/**
 * Maps detected groups to their region for guidance purposes.
 */
function inferRegions(groups: string[]): string[] {
  const granChacoGroups = ['ayoreo', 'ayoré', 'guaraní', 'chaco'];
  const altiplanoGroups = ['aymara', 'quechua'];
  const amazoniaGroups = ['chiquitano', 'mojeño', 'moxeño', 'ignaciano', 'tacana', 'tanimbu', 'baure'];
  const tierrasBajasGroups = ['ché guazú'];

  const inferred: string[] = [];

  for (const group of groups) {
    if (granChacoGroups.includes(group.toLowerCase())) {
      inferred.push('Gran Chaco');
    }
    if (altiplanoGroups.includes(group.toLowerCase())) {
      inferred.push('Altiplano');
    }
    if (amazoniaGroups.includes(group.toLowerCase())) {
      inferred.push('Amazonía');
    }
    if (tierrasBajasGroups.includes(group.toLowerCase())) {
      inferred.push('Tierras Bajas');
    }
  }

  return [...new Set(inferred)];
}

/**
 * Generates a concise cultural prefix to inject into motor prompts.
 * Max ~250 tokens, Spanish class-friendly (5-10 year olds).
 */
export function culturalPrefix(context: ReturnType<typeof detectIndigenousContext>): string {
  if (!context.detected) return '';

  const regions = inferRegions(context.groups).length > 0 ? inferRegions(context.groups) : context.regions;

  // Gran Chaco guidance (Ayoreo, Guaraní-Ñandeva)
  const granChacoGuide = `• Gran Chaco (Ayoreo, Guaraní): colores ocres/marrones/xerophytic, tradición NO figurativa humana (enfoque en jaguar, cactus, paisaje seco), SIN imagery andino, SIN alpacas/llamas. Ejemplo: "un jaguar del Chaco con manchas naturales" (NO "una abuelita con pluma").`;

  // Altiplano guidance (Aymara, Quechua)
  const altiplanoGuide = `• Altiplano (Aymara, Quechua): colores azul/blanco/rojo, patrones de aguayo, alpacas, montañas. Ejemplo: "una alpaca junto a un lago azul del altiplano" (NO "vestimenta tradicional completa").`;

  // Amazonía guidance (Chiquitano, Mojeño)
  const amazoniaGuide = `• Amazonía (Chiquitano, Mojeño): colores verdes/ríos, ceibas, mariposas. Ejemplo: "una ceiba junto al río con mariposas amarillas" (NO figuras humanas en contexto sagrado).`;

  // Tierras Bajas guidance (Ché Guazú)
  const tierrasBajasGuide = `• Tierras Bajas (Ché Guazú): colores rojo amapola, lapacho rosado. Ejemplo: "flores de lapacho rosado en el bosque tropical" (NO "guerrero").`;

  const regionGuidesRaw: (string | null)[] = regions.map((r) => {
    if (r.includes('Gran Chaco') || r.includes('Chaco')) return granChacoGuide;
    if (r.includes('Altiplano')) return altiplanoGuide;
    if (r.includes('Amazonía') || r.includes('Amazonia')) return amazoniaGuide;
    if (r.includes('Tierras Bajas')) return tierrasBajasGuide;
    return null;
  });

  const regionGuides = regionGuidesRaw.filter((g): g is string => g !== null);
  const uniqueGuides = [...new Set<string>(regionGuides)];

  const rules = `REGLAS DE SENSIBILIDAD CULTURAL (clase de 5-10 años):
${uniqueGuides.join('\n')}
• NO inventar: ceremonias, eventos históricos, trajes típicos, símbolos sagrados
• Usar lenguaje NO figurativo: enfoque en animales, paisajes, elementos abstractos
• EVITAR términos genéricos: "tribal", "shamanic", "warrior", "primitivo"
• Para indígena ≠ peligroso/guerrero — la comunidad es parte de la vida cotidiana del campo boliviano`;

  return rules;
}
