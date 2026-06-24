/**
 * Unit/Topic parser for the Lenguaje textbook (Texto de lenguaje.pdf).
 *
 * Uses a hardcoded map of units and topics derived from the known textbook
 * structure, then populates fullText from the cleaned OCR output.
 *
 * Also provides a generic `parseUnitsFromText` detector that works for
 * ANY Spanish-language textbook by finding "EN ESTA UNIDAD" markers and
 * topic structure (Aprende boxes, quoted titles).
 */

export interface Topic {
  id: string;
  unitId: string;
  unitName: string;
  topicNumber: number;
  topicName: string;
  topicType: 'lectura' | 'gramatica' | 'vocabulario' | 'escritura' | 'oral';
  textExcerpt: string;
  fullText: string;
}

export interface Unit {
  id: string;
  number: number;
  name: string;
  fullName: string;
  pageStart?: number;
  pageEnd?: number;
  topics: Topic[];
  mainText: string;
}

const LENGUAJE_UNITS: Unit[] = [
  {
    id: 'u1',
    number: 1,
    name: 'Mitos y leyendas',
    fullName: 'Unidad 1: Mitos y leyendas',
    pageStart: 1,
    pageEnd: 30,
    mainText: '',
    topics: [
      {
        id: 'u1-t1',
        unitId: 'u1',
        unitName: 'Unidad 1: Mitos y leyendas',
        topicNumber: 1,
        topicName: 'Guedé pinta los animales',
        topicType: 'lectura',
        textExcerpt: 'Mito ayoreo sobre el origen de los colores de los animales...',
        fullText: '',
      },
      {
        id: 'u1-t2',
        unitId: 'u1',
        unitName: 'Unidad 1: Mitos y leyendas',
        topicNumber: 2,
        topicName: "Mito chino de la creación (P'an-ku)",
        topicType: 'lectura',
        textExcerpt: "Mito chino sobre el origen del universo a partir de P'an-ku...",
        fullText: '',
      },
      {
        id: 'u1-t3',
        unitId: 'u1',
        unitName: 'Unidad 1: Mitos y leyendas',
        topicNumber: 3,
        topicName: 'El pájaro de fuego',
        topicType: 'lectura',
        textExcerpt: 'Cuento de Oscar Alfaro sobre un pájaro que se hace pasar por flor...',
        fullText: '',
      },
      {
        id: 'u1-t4',
        unitId: 'u1',
        unitName: 'Unidad 1: Mitos y leyendas',
        topicNumber: 4,
        topicName: 'El sustantivo y sus clases',
        topicType: 'gramatica',
        textExcerpt: 'Sustantivos comunes, propios, abstractos, concretos...',
        fullText: '',
      },
      {
        id: 'u1-t5',
        unitId: 'u1',
        unitName: 'Unidad 1: Mitos y leyendas',
        topicNumber: 5,
        topicName: 'Determinantes numerales e indefinidos',
        topicType: 'gramatica',
        textExcerpt: 'Los determinantes numerales (uno, dos, primer...) y los indefinidos (algún, ningún...)',
        fullText: '',
      },
      {
        id: 'u1-t6',
        unitId: 'u1',
        unitName: 'Unidad 1: Mitos y leyendas',
        topicNumber: 6,
        topicName: 'El uso de la tilde',
        topicType: 'gramatica',
        textExcerpt: 'Reglas de tildación en palabras agudas, graves y esdrújulas...',
        fullText: '',
      },
      {
        id: 'u1-t7',
        unitId: 'u1',
        unitName: 'Unidad 1: Mitos y leyendas',
        topicNumber: 7,
        topicName: 'Redacción de un resumen narrativo y diario',
        topicType: 'escritura',
        textExcerpt: 'Cómo escribir un resumen narrativo y entradas de diario personal...',
        fullText: '',
      },
    ],
  },
  {
    id: 'u2',
    number: 2,
    name: 'La narración de aventuras',
    fullName: 'Unidad 2: La narración de aventuras',
    pageStart: 32,
    pageEnd: 68,
    mainText: '',
    topics: [
      {
        id: 'u2-t1',
        unitId: 'u2',
        unitName: 'Unidad 2: La narración de aventuras',
        topicNumber: 1,
        topicName: 'La isla del tesoro (capítulo "Voy a Bristol")',
        topicType: 'lectura',
        textExcerpt: 'Fragmento del capítulo 7 de La isla del tesoro, R.L. Stevenson...',
        fullText: '',
      },
      {
        id: 'u2-t2',
        unitId: 'u2',
        unitName: 'Unidad 2: La narración de aventuras',
        topicNumber: 2,
        topicName: 'Prefijos y sufijos',
        topicType: 'gramatica',
        textExcerpt: 'Formación de palabras con prefijos (re-, des-, pre-) y sufijos (-dor, -ción)...',
        fullText: '',
      },
      {
        id: 'u2-t3',
        unitId: 'u2',
        unitName: 'Unidad 2: La narración de aventuras',
        topicNumber: 3,
        topicName: 'La entrevista (estructura)',
        topicType: 'escritura',
        textExcerpt: 'Cómo escribir una entrevista: introducción, desarrollo, cierre...',
        fullText: '',
      },
      {
        id: 'u2-t4',
        unitId: 'u2',
        unitName: 'Unidad 2: La narración de aventuras',
        topicNumber: 4,
        topicName: 'Desinencias verbales',
        topicType: 'gramatica',
        textExcerpt: 'Raíz, persona, número, tiempo, modo verbal...',
        fullText: '',
      },
      {
        id: 'u2-t5',
        unitId: 'u2',
        unitName: 'Unidad 2: La narración de aventuras',
        topicNumber: 5,
        topicName: 'Biografía: Barbanegra',
        topicType: 'lectura',
        textExcerpt: 'Vida del pirata Edward Teach (1680-1718)...',
        fullText: '',
      },
    ],
  },
  {
    id: 'u3',
    number: 3,
    name: 'La narración de miedo',
    fullName: 'Unidad 3: La narración de miedo',
    pageStart: 51,
    pageEnd: 86,
    mainText: '',
    topics: [
      {
        id: 'u3-t1',
        unitId: 'u3',
        unitName: 'Unidad 3: La narración de miedo',
        topicNumber: 1,
        topicName: 'La aparición de la señora Veal',
        topicType: 'lectura',
        textExcerpt: 'Cuento de Daniel Defoe sobre una aparición fantasmal...',
        fullText: '',
      },
      {
        id: 'u3-t2',
        unitId: 'u3',
        unitName: 'Unidad 3: La narración de miedo',
        topicNumber: 2,
        topicName: 'Verbos regulares y conjugación',
        topicType: 'gramatica',
        textExcerpt: 'Conjugación de verbos regulares en presente, pasado y futuro...',
        fullText: '',
      },
      {
        id: 'u3-t3',
        unitId: 'u3',
        unitName: 'Unidad 3: La narración de miedo',
        topicNumber: 3,
        topicName: 'Tilde diacrítica en monosílabos',
        topicType: 'gramatica',
        textExcerpt: 'Tilde en dé, sé, mí, tú, él...',
        fullText: '',
      },
      {
        id: 'u3-t4',
        unitId: 'u3',
        unitName: 'Unidad 3: La narración de miedo',
        topicNumber: 4,
        topicName: 'Texto teatral (estructura)',
        topicType: 'lectura',
        textExcerpt: 'Actos, escenas, acotaciones, diálogos...',
        fullText: '',
      },
    ],
  },
  {
    id: 'u4',
    number: 4,
    name: 'El cómic y la narración fantástica',
    fullName: 'Unidad 4: El cómic y la narración fantástica',
    pageStart: 70,
    pageEnd: 114,
    mainText: '',
    topics: [
      {
        id: 'u4-t1',
        unitId: 'u4',
        unitName: 'Unidad 4: El cómic y la narración fantástica',
        topicNumber: 1,
        topicName: 'Algo verde entró al bosque',
        topicType: 'lectura',
        textExcerpt: 'Cómic de Franco Vaccarini sobre criaturas fantásticas...',
        fullText: '',
      },
      {
        id: 'u4-t2',
        unitId: 'u4',
        unitName: 'Unidad 4: El cómic y la narración fantástica',
        topicNumber: 2,
        topicName: 'Elementos del cómic',
        topicType: 'gramatica',
        textExcerpt: 'Viñetas, globos, onomatopeyas, metáforas visuales...',
        fullText: '',
      },
      {
        id: 'u4-t3',
        unitId: 'u4',
        unitName: 'Unidad 4: El cómic y la narración fantástica',
        topicNumber: 3,
        topicName: 'Palabras homónimas, homófonas, homógrafas',
        topicType: 'gramatica',
        textExcerpt: 'Diferencias entre palabras que suenan igual o se escriben igual...',
        fullText: '',
      },
      {
        id: 'u4-t4',
        unitId: 'u4',
        unitName: 'Unidad 4: El cómic y la narración fantástica',
        topicNumber: 4,
        topicName: 'Verbos irregulares y participios',
        topicType: 'gramatica',
        textExcerpt: 'Conjugación de verbos irregulares...',
        fullText: '',
      },
      {
        id: 'u4-t5',
        unitId: 'u4',
        unitName: 'Unidad 4: El cómic y la narración fantástica',
        topicNumber: 5,
        topicName: 'Creación de un cómic',
        topicType: 'escritura',
        textExcerpt: 'Cómo planificar un cómic: inicio, nudo, desenlace...',
        fullText: '',
      },
    ],
  },
  {
    id: 'u5',
    number: 5,
    name: 'La narración policial',
    fullName: 'Unidad 5: La narración policial',
    pageStart: 89,
    pageEnd: 125,
    mainText: '',
    topics: [
      {
        id: 'u5-t1',
        unitId: 'u5',
        unitName: 'Unidad 5: La narración policial',
        topicNumber: 1,
        topicName: 'El puñal de plata',
        topicType: 'lectura',
        textExcerpt: 'Cuento policial de Blanca Isaza de Jaramillo Meza...',
        fullText: '',
      },
      {
        id: 'u5-t2',
        unitId: 'u5',
        unitName: 'Unidad 5: La narración policial',
        topicNumber: 2,
        topicName: 'Modo verbal (indicativo, subjuntivo, imperativo)',
        topicType: 'gramatica',
        textExcerpt: 'Los tres modos verbales y sus usos...',
        fullText: '',
      },
      {
        id: 'u5-t3',
        unitId: 'u5',
        unitName: 'Unidad 5: La narración policial',
        topicNumber: 3,
        topicName: 'Palabras parónimas',
        topicType: 'gramatica',
        textExcerpt: 'Palabras que se escriben y pronuncian parecido pero significan diferente...',
        fullText: '',
      },
      {
        id: 'u5-t4',
        unitId: 'u5',
        unitName: 'Unidad 5: La narración policial',
        topicNumber: 4,
        topicName: 'Letras b y v (reglas ortográficas)',
        topicType: 'gramatica',
        textExcerpt: 'Reglas para escribir con b y v...',
        fullText: '',
      },
      {
        id: 'u5-t5',
        unitId: 'u5',
        unitName: 'Unidad 5: La narración policial',
        topicNumber: 5,
        topicName: 'Redacción de reglas de juego',
        topicType: 'escritura',
        textExcerpt: 'Cómo escribir instrucciones claras para un juego...',
        fullText: '',
      },
    ],
  },
  {
    id: 'u6',
    number: 6,
    name: 'Mujercitas y la amistad',
    fullName: 'Unidad 6: Mujercitas y la amistad',
    pageStart: 111,
    pageEnd: 145,
    mainText: '',
    topics: [
      {
        id: 'u6-t1',
        unitId: 'u6',
        unitName: 'Unidad 6: Mujercitas y la amistad',
        topicNumber: 1,
        topicName: 'Mujercitas (fragmento)',
        topicType: 'lectura',
        textExcerpt: 'Fragmento de Mujercitas de Louisa May Alcott sobre Beth y Laurie...',
        fullText: '',
      },
      {
        id: 'u6-t2',
        unitId: 'u6',
        unitName: 'Unidad 6: Mujercitas y la amistad',
        topicNumber: 2,
        topicName: 'La reciprocidad',
        topicType: 'oral',
        textExcerpt: 'El valor de la reciprocidad en las relaciones...',
        fullText: '',
      },
      {
        id: 'u6-t3',
        unitId: 'u6',
        unitName: 'Unidad 6: Mujercitas y la amistad',
        topicNumber: 3,
        topicName: 'La noticia (estructura)',
        topicType: 'escritura',
        textExcerpt: 'Cómo escribir una noticia: qué, quién, dónde, cuándo, por qué...',
        fullText: '',
      },
      {
        id: 'u6-t4',
        unitId: 'u6',
        unitName: 'Unidad 6: Mujercitas y la amistad',
        topicNumber: 4,
        topicName: 'Pronombres interrogativos y exclamativos',
        topicType: 'gramatica',
        textExcerpt: 'Qué, quién, cuál, dónde, cómo con tilde...',
        fullText: '',
      },
      {
        id: 'u6-t5',
        unitId: 'u6',
        unitName: 'Unidad 6: Mujercitas y la amistad',
        topicNumber: 5,
        topicName: 'Poesía: haiku y tanka',
        topicType: 'lectura',
        textExcerpt: 'Poesía japonesa tradicional: haiku (3 versos) y tanka (5 versos)...',
        fullText: '',
      },
    ],
  },
];

/**
 * Returns the hardcoded Lenguaje textbook unit/topic map.
 */
export function getLenguajeUnits(): Unit[] {
  return structuredClone(LENGUAJE_UNITS);
}

/**
 * Finds the best anchor string to locate a topic within the cleaned OCR text.
 * Strips trailing parentheticals and quotes for better matching.
 */
function topicAnchor(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*".*?"\s*/g, ' ')
    .replace(/\s*'.*?'\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts a section of text around the first occurrence of `anchor`.
 * If not found, falls back to searching the next 3 words of the topic name.
 * Returns up to `window` characters centered on the match.
 */
function extractAroundAnchor(
  text: string,
  anchor: string,
  window = 2500
): string {
  const lower = text.toLowerCase();
  const anchorLower = anchor.toLowerCase();
  let idx = lower.indexOf(anchorLower);

  if (idx === -1) {
    // Try each significant word of the anchor
    const words = anchorLower.split(/\s+/).filter((w) => w.length > 4);
    for (const word of words.slice(0, 3)) {
      idx = lower.indexOf(word);
      if (idx !== -1) break;
    }
  }

  if (idx === -1) return '';

  const start = Math.max(0, idx - Math.floor(window / 2));
  const end = Math.min(text.length, start + window);
  return text.slice(start, end);
}

/**
 * Populates fullText for every topic by searching the cleaned OCR text.
 * Also builds mainText for each unit.
 *
 * Grammar topics that can't be precisely located are given a broader
 * extraction around the unit's anchor or a generic placeholder.
 */
export function populateTopicTexts(units: Unit[], cleanedText: string): Unit[] {
  return units.map((unit) => {
    const topics = unit.topics.map((topic) => {
      const anchor = topicAnchor(topic.topicName);
      let fullText = extractAroundAnchor(cleanedText, anchor, 2500);

      // If lectura still empty, the named text might appear in quotes or alternate form
      if (!fullText && topic.topicType === 'lectura') {
        // Try stripping "fragmento", "capítulo", etc.
        const altAnchor = anchor
          .replace(/fragmento de/i, '')
          .replace(/capítulo [\d"]+/i, '')
          .replace(/^la\s+/i, '')
          .trim();
        fullText = extractAroundAnchor(cleanedText, altAnchor, 2500);
      }

      // Grammar/vocab topics that remain empty get a broader unit-level extract
      if (!fullText && (topic.topicType === 'gramatica' || topic.topicType === 'vocabulario')) {
        const grammaAnchor = topicAnchor(topic.topicName.split(' ')[0]);
        fullText = extractAroundAnchor(cleanedText, grammaAnchor, 2000);
      }

      // Build textExcerpt from fullText (first 500 chars)
      const textExcerpt = fullText
        ? fullText.slice(0, 500).replace(/\s+/g, ' ').trim() + '...'
        : topic.textExcerpt;

      return { ...topic, fullText, textExcerpt };
    });

    // Combine all topic fullText into mainText
    const mainText = topics.map((t) => t.fullText).filter(Boolean).join('\n\n');

    return { ...unit, topics, mainText };
  });
}

/**
 * Generic unit/topic detector for Spanish-language textbooks.
 * Works by detecting "EN ESTA UNIDAD" markers and topic structure within each.
 */
export function parseUnitsFromText(text: string): Unit[] {
  // 1. Find all unit markers "EN ESTA UNIDAD" or "UNIDAD N"
  const unitRegex = /EN\s+ESTA\s+UNIDAD[:\s]+([^\n]+)|UNIDAD\s+(\d+)[:\s]+([^\n]+)/gi;
  const unitMatches: { start: number; end: number; name: string; number: number }[] = [];
  let match;
  while ((match = unitRegex.exec(text)) !== null) {
    const name = match[1] || match[3] || 'Unidad';
    const numberMatch = match[2] ? parseInt(match[2]) : unitMatches.length + 1;
    unitMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      name: name.trim(),
      number: numberMatch,
    });
  }

  // 2. For each unit, extract the text between this unit and the next
  const units: Unit[] = [];
  for (let i = 0; i < unitMatches.length; i++) {
    const start = unitMatches[i].end;
    const end = i + 1 < unitMatches.length ? unitMatches[i + 1].start : text.length;
    const unitText = text.substring(start, end);

    // 3. Extract topics within this unit
    const topics = extractTopicsFromUnitText(unitText, i + 1, unitMatches[i].name);

    units.push({
      id: `u${i + 1}`,
      number: i + 1,
      name: unitMatches[i].name,
      fullName: `Unidad ${i + 1}: ${unitMatches[i].name}`,
      mainText: unitText,
      topics,
    });
  }

  return units;
}

function extractTopicsFromUnitText(text: string, unitNumber: number, unitName: string): Topic[] {
  const topics: Topic[] = [];

  // Detect "Aprende" boxes (grammar topics)
  const aprendeRegex = />\s*Aprende\s*([^\n]+)/gi;
  let match;
  while ((match = aprendeRegex.exec(text)) !== null) {
    const topicName = match[1].trim();
    topics.push({
      id: `u${unitNumber}-t${topics.length + 1}`,
      unitId: `u${unitNumber}`,
      unitName: `Unidad ${unitNumber}: ${unitName}`,
      topicNumber: topics.length + 1,
      topicName,
      topicType: 'gramatica',
      textExcerpt: match[0],
      fullText: extractAprendeContext(text, match.index),
    });
  }

  // Detect reading texts (titles in quotes or specific patterns)
  const lecturaRegex = /"([^"]{5,60})"/g;
  while ((match = lecturaRegex.exec(text)) !== null) {
    const title = match[1].trim();
    if (title.length > 8 && !topics.some((t) => t.topicName === title)) {
      topics.push({
        id: `u${unitNumber}-t${topics.length + 1}`,
        unitId: `u${unitNumber}`,
        unitName: `Unidad ${unitNumber}: ${unitName}`,
        topicNumber: topics.length + 1,
        topicName: title,
        topicType: 'lectura',
        textExcerpt: match[0],
        fullText: extractLecturaContext(text, match.index),
      });
    }
  }

  return topics;
}

function extractAprendeContext(text: string, startPos: number): string {
  // Get 2000 chars after the "Aprende" marker
  return text.substring(startPos, startPos + 2000);
}

function extractLecturaContext(text: string, startPos: number): string {
  // Get 3000 chars centered on the quote
  return text.substring(Math.max(0, startPos - 500), startPos + 2500);
}

/**
 * Returns units for a given text. Uses generic detection first,
 * falls back to hardcoded Lenguaje map if the text matches "lenguaje".
 */
export function getUnitsForText(text: string, subjectHint?: string): Unit[] {
  // Try to detect units from text first
  const detected = parseUnitsFromText(text);
  if (detected.length > 0) {
    return detected;
  }
  // Fallback: return hardcoded map based on subject
  if (subjectHint?.toLowerCase().includes('lenguaje')) {
    return getLenguajeUnits();
  }
  return [];
}

/**
 * Parses the Lenguaje textbook.
 * Currently returns the hardcoded map with texts populated from `cleanedText`.
 */
export function parseUnits(cleanedText: string): Unit[] {
  const units = getLenguajeUnits();
  return populateTopicTexts(units, cleanedText);
}
