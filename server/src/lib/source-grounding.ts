// server/src/lib/source-grounding.ts
// Post-generation validator: detecta contenido en el output del motor que NO está en full_text
// Enfoque: SOLO patrones de alto riesgo conocidos. Sin ruido.

export interface FidelityWarning {
    slide_number?: number;
    severity: 'HIGH' | 'MEDIUM';
    category: string;
    flagged_text: string;
    reason: string;
    suggestion: string;
}

export interface FidelityReport {
    score: number; // 0-100, higher is better
    total_flags: number;
    warnings: FidelityWarning[];
}

// Patrones de ALTO riesgo que el LLM típicamente inventa cuando NO están en fuente
// Solo patrones probados como problemáticos en pruebas reales
const HIGH_RISK_PATTERNS: Array<{ pattern: RegExp; category: string; reason: string; suggestion: string }> = [
    {
        pattern: /\bmujer\s+sabia\b/gi,
        category: 'rol_inventado',
        reason: '"mujer sabia" no aparece en el texto fuente',
        suggestion: 'Si el rol no está en la fuente, usa solo "Guede" o elimina la caracterización.'
    },
    {
        pattern: /\b(arcilla|barro|tierra\s+de\s+colores)\b/gi,
        category: 'material_inventado',
        reason: 'Material específico no mencionado en la fuente',
        suggestion: 'Reemplazar con "materiales de la naturaleza" o eliminar.'
    },
    {
        pattern: /\b(jaguar|jaguars)\b/gi,
        category: 'animal_inventado',
        reason: 'Animal específico (jaguar) no mencionado en la fuente',
        suggestion: 'Usar "los animales" o solo mencionar animales del texto.'
    },
    {
        pattern: /\b(lapa|lapas)\b/gi,
        category: 'animal_inventado',
        reason: 'Animal específico (lapa) no mencionado en la fuente',
        suggestion: 'Usar "los animales" o solo mencionar animales del texto.'
    },
    {
        pattern: /\b(loro|loros)\b/gi,
        category: 'animal_inventado',
        reason: 'Animal específico (loro) no mencionado en la fuente',
        suggestion: 'Usar "los animales" o solo mencionar animales del texto.'
    },
    {
        pattern: /\b(venado|ardilla|zorro|mono|puma|condor|pájaro)\b/gi,
        category: 'animal_inventado',
        reason: 'Animal específico no mencionado en la fuente',
        suggestion: 'Verificar si este animal está en el texto fuente.'
    },
    {
        pattern: /\bmanchas?\s+negras?\b/gi,
        category: 'color_inventado',
        reason: 'Color específico (manchas negras) no mencionado en la fuente',
        suggestion: 'Usar "diferentes colores" o generalizar.'
    },
    {
        pattern: /\bplumas?\s+(naranjas?|verdes?\s+y\s+rojas?|multicolores?|rojas?|azules?)\b/gi,
        category: 'color_inventado',
        reason: 'Color específico de plumas no mencionado en la fuente',
        suggestion: 'Usar lenguaje genérico sobre colores.'
    },
    {
        pattern: /\brío\s+Parapetí\b/gi,
        category: 'lugar_inventado',
        reason: 'Nombre propio de lugar no verificado en la fuente',
        suggestion: 'Usar "un río" o verificar el nombre.'
    },
    {
        pattern: /\bcreador(a)?\s+(del?\s+pueblo|de\s+los\s+animales)\b/gi,
        category: 'rol_inventado',
        reason: 'Rol específico no mencionado en la fuente',
        suggestion: 'Solo asignar roles que aparezcan explícitamente en el texto.'
    },
    {
        pattern: /\bel\s+sol\s+(envió|mandó|delegó|envío)\b/gi,
        category: 'accion_inventada',
        reason: 'Acción específica del Sol no mencionada en la fuente',
        suggestion: 'Solo mencionar lo que el texto dice sobre el Sol.'
    },
    {
        pattern: /\bguede\s+(decidió|eligió|quiso|tuvo\s+la\s+idea|decide)\b/gi,
        category: 'motivacion_inventada',
        reason: 'Motivación específica de Guede no mencionada en la fuente',
        suggestion: 'Solo describir lo que la fuente dice explícitamente.'
    },
    {
        pattern: /\btomó\s+(arcilla|del\s+río|agua)\b/gi,
        category: 'accion_inventada',
        reason: 'Acción específica no mencionada en la fuente',
        suggestion: 'Solo describir acciones del texto.'
    },
    {
        pattern: /\b(dios|diosa|divinidad)\b/gi,
        category: 'rol_inventado',
        reason: 'Término religioso no mencionado en la fuente',
        suggestion: 'Solo usar si el texto lo menciona.'
    }
];

/**
 * Valida la fidelidad del output del motor contra el texto fuente.
 * Solo detecta patrones de ALTO riesgo conocidos.
 * Retorna score 0-100 y lista de advertencias.
 */
export function validateSourceFidelity(
    output: unknown,
    fullText: string,
    options: { type?: 'slides' | 'plan' | 'quiz' | 'narrator' } = {}
): FidelityReport {
    const warnings: FidelityWarning[] = [];

    if (!fullText || fullText.length < 10) {
        return { score: 100, total_flags: 0, warnings: [] };
    }

    const sourceTextLower = fullText.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Extract text content from output based on type
    let textSegments: Array<{ slide_number?: number; text: string }> = [];

    if (options.type === 'slides' && Array.isArray(output)) {
        textSegments = output.map((s: any, idx: number) => ({
            slide_number: s.numero || idx + 1,
            text: `${s.titulo || ''} ${s.texto_pantalla || ''} ${s.guion_docente || ''} ${s.callout || ''}`
        }));
    } else if (typeof output === 'object' && output !== null) {
        const o = output as any;
        const allText = [
            o.narrative_summary || '',
            ...(o.characters || []).map((c: any) => `${c.name || ''} ${c.role || ''} ${c.description || ''} ${c.key_quote || ''}`),
            ...(o.sequence || []).map((s: any) => `${s.event || ''} ${s.significance || ''}`),
            ...(o.examples || []).map((e: any) => `${e.content || ''} ${e.source_quote || ''}`),
            ...(o.cultural_anchors || []).map((a: any) => `${a.term || ''} ${a.definition || ''} ${a.context || ''}`),
            ...(o.vivid_details || [])
        ].join(' ');
        textSegments = [{ text: allText }];
    }

    let totalChecks = 0;
    let passedChecks = 0;

    // Check each text segment — ONLY HIGH RISK PATTERNS
    textSegments.forEach(segment => {
        const text = segment.text;
        const textLower = text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        HIGH_RISK_PATTERNS.forEach(({ pattern, category, reason, suggestion }) => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const matchLower = match.toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    // Verify if pattern is grounded in source
                    if (!sourceTextLower.includes(matchLower)) {
                        totalChecks++;
                        warnings.push({
                            slide_number: segment.slide_number,
                            severity: 'HIGH',
                            category,
                            flagged_text: match,
                            reason,
                            suggestion
                        });
                    } else {
                        passedChecks++;
                    }
                });
            }
        });
    });

    // Score: 100 if no issues, drop with each HIGH flag
    const score = totalChecks === 0 ? 100 : Math.max(0, 100 - (totalChecks - passedChecks) * 15);

    return {
        score,
        total_flags: warnings.length,
        warnings
    };
}