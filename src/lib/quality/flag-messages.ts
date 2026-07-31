import type { QualityFlag } from '../../components/Quality/QualityBadge';

// Flag code → human-readable Spanish message
const FLAG_MESSAGES: Record<string, string> = {
  TEXT_TOO_LONG: 'Hay diapositivas con demasiado texto (máx. 150 caracteres)',
  GUION_TOO_LONG: 'El guion del docente excede el límite recomendado (200 caracteres)',
  LLM_SPRAWL: 'Se detectó contenido excesivo que puede ser invención del LLM',
  MISSING_REQUIRED_FIELD: 'Falta un campo requerido en alguna diapositiva',
  NO_ACTIVITY_BREAK: 'No hay slide de pausa/actividad para descansar',
  NO_PROMPT_VARIATIONS: 'No hay prompts de imagen para generar visuales',
  NO_KEY_CONCEPTS: 'Faltan conceptos clave o temas desarrollados',
  PLACEHOLDER_DETECTED: 'Se detectaron placeholders o texto incompleto',
  EMPTY_REQUIRED_FIELD: 'Hay campos vacíos requeridos en las diapositivas',
  CULTURAL_GENERIC: 'El prompt de imagen puede usar imaginería cultural genérica',
  MISSING_PORTADA: 'Falta slide de portada',
  MISSING_OBJETIVOS: 'Falta slide de objetivos de aprendizaje',
  MISSING_CIERRE: 'Falta slide de cierre',
  MISSING_INICIO: 'Falta bloque de Inicio en el plan',
  MISSING_DESARROLLO: 'Falta bloque de Desarrollo en el plan',
  MISSING_PLAN_CIERRE: 'Falta bloque de Cierre en el plan',
  MISSING_BLOQUES: 'Faltan bloques en la secuencia didáctica',
  NO_PREGUNTAS: 'No hay preguntas en el quiz',
  MONOTYPE_PREGUNTAS: 'Todas las preguntas son del mismo tipo — mezcla para variedad pedagógica',
};

export function formatFlag(flag: QualityFlag): string {
  if (flag.message) return flag.message;
  return FLAG_MESSAGES[flag.code] || `Problema: ${flag.code}`;
}
