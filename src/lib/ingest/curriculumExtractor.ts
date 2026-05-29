import { callMinimax } from '../ai/minimaxClient';
import alpha2Prompt from '../../prompts/Motor_Alpha-2.md?raw';
import type { IngestResult, CurriculumResult } from './types';

export function extractCurriculum(ingest: IngestResult, _grado_nivel: string = '5to Primaria'): CurriculumResult {
  if (!ingest.ok || !ingest.fullText) {
    return { unidad_real: 'Sin datos', temas: [], contenido_temas: {}, paginas_temas: {} };
  }

  const fullText = ingest.fullText;
  const lines = fullText.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);

  // 1. Detect unit name
  let unidad_real = 'Unidad sin nombre';
  const unitMatch = fullText.match(/(?:Unidad|Unit)[^\n]{0,80}/i);
  if (unitMatch) {
    unidad_real = unitMatch[0].slice(0, 80).trim();
  } else if (lines[0]) {
    unidad_real = lines[0].slice(0, 80);
  }

  // 2. Detect topics
  const topicPatterns = [
    /^(?:\d+\.?\d*\s*[):\.]\s*)(.+)/,
    /^[-*•]\s+(.+)/,
    /^(?:TEMA|LECCIÓN|CAPÍTULO|UNIDAD)\s*\d*[:\s]+(.+)/i,
    /^(?:#{1,3}\s+)(.+)/,
  ];

  const temas: string[] = [];
  const contenido_temas: Record<string, string> = {};
  const paginas_temas: Record<string, string> = {};
  let currentTopic: string | null = null;
  let currentContent: string[] = [];

  function flushTopic() {
    if (currentTopic && currentContent.length > 0) {
      const topic = currentTopic.trim();
      if (!temas.includes(topic)) {
        temas.push(topic);
        contenido_temas[topic] = currentContent.join(' ').slice(0, 500);
      }
    }
    currentTopic = null;
    currentContent = [];
  }

  for (const line of lines) {
    let matched = false;
    for (const pattern of topicPatterns) {
      const m = line.match(pattern);
      if (m) {
        flushTopic();
        currentTopic = m[1].trim().slice(0, 100);
        currentContent = [line.replace(pattern, '').trim()];
        matched = true;
        break;
      }
    }
    if (!matched && currentTopic) {
      if (currentContent.join(' ').length < 300) currentContent.push(line);
    }
    const pageMatch = line.match(/pp?\.\s*(\d+[\-–]\d+|\d+)/);
    if (pageMatch && currentTopic) {
      const range = pageMatch[1];
      if (!paginas_temas[currentTopic]) paginas_temas[currentTopic] = `pp. ${range}`;
    }
  }
  flushTopic();

  // 3. Quality gate
  const avgContentLen = temas.length > 0
    ? Object.values(contenido_temas).reduce((sum, c) => sum + c.length, 0) / temas.length
    : 0;

  if (temas.length > 10 || (temas.length > 0 && avgContentLen < 30)) {
    temas.length = 0;
    for (const key of Object.keys(contenido_temas)) delete contenido_temas[key];
    for (const key of Object.keys(paginas_temas)) delete paginas_temas[key];
  }

  // 4. Fallback
  if (temas.length === 0) {
    const fileMatch = ingest.metadata.fileName.match(/[Uu]nidad\s*(\d+)/i);
    if (fileMatch) unidad_real = 'Unidad ' + fileMatch[1];
  }

  return { unidad_real, temas, contenido_temas, paginas_temas };
}

export async function ingestAndExtract(
  file: File,
  grado_nivel?: string,
  onProgress?: (stage: string, percent: number) => void,
): Promise<{ ingest: IngestResult; curriculum: CurriculumResult }> {
  const { ingestDocument } = await import('./documentIngester');
  const ingest = await ingestDocument(file, onProgress);
  const curriculum = extractCurriculum(ingest, grado_nivel);
  return { ingest, curriculum };
}

export async function extractCurriculumWithAI(
  ingest: IngestResult,
  grado_nivel: string = '5to Primaria',
): Promise<CurriculumResult> {
  if (!ingest.ok || !ingest.fullText || ingest.fullText.length < 10) {
    return { unidad_real: 'Sin datos', temas: [], contenido_temas: {}, paginas_temas: {} };
  }

  try {
    const userMessage = [
      'grado_nivel: ' + grado_nivel,
      '',
      'TEXTO EXTRAIDO DEL DOCUMENTO:',
      ingest.fullText.slice(0, 8000),
      '',
      'Extrae la unidad, TODOS los temas, contenido de cada tema (del texto proporcionado), y paginas si las hay.',
      'Responde SOLO con JSON valido, sin explicaciones ni markdown.',
    ].join('\n');

    const result = await callMinimax(alpha2Prompt, userMessage, {
      temperature: 0.3,
      maxTokens: 4096,
      jsonMode: true,
    });

    if (!result.ok) {
      console.warn('AI extraction failed:', result.error, '— falling back to regex');
      return extractCurriculum(ingest, grado_nivel);
    }

    try {
      const parsed = JSON.parse(result.text);
      return {
        unidad_real: parsed.unidad_real || 'Unidad sin nombre',
        temas: Array.isArray(parsed.temas) ? parsed.temas : [],
        contenido_temas: parsed.contenido_temas || {},
        paginas_temas: parsed.paginas_temas || {},
      };
    } catch {
      console.warn('AI returned invalid JSON, falling back to regex');
      return extractCurriculum(ingest, grado_nivel);
    }
  } catch (err) {
    console.warn('AI extraction error:', err, '— falling back to regex');
    return extractCurriculum(ingest, grado_nivel);
  }
}
