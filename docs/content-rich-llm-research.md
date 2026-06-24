# Investigación: Generación de contenido educativo rico con LLMs

> **Proyecto:** PRIA v10 — Plataforma educativa para docentes de 5to de primaria en Bolivia
> **Problema:** Los motores IA generan estructura correcta (10 slides, objetivos, definiciones) pero **metadatos sobre el tema**, no la narrativa real, personajes, secuencia cultural ni ejemplos del texto fuente.
> **Fecha:** Junio 2026
> **Fuentes:** ~20 papers/blogs de 2023-2026 (Khan Academy, MagicSchool, Curipod, Diffit, LangChain, Anthropic, ACM, EDM, arXiv)

---

## TL;DR — 7 hallazgos accionables

1. **El problema es universal.** Chen et al. (UPenn/U-Michigan, 2024) analizaron planes de clase generados por IA y concluyeron que tienen *"a general tendency toward passive learning, lack of interactivity, and lack of critical thinking activities"* y que *"AI reflects the average, not the visionary"* — exactamente el síntoma que vemos en PRIA. [Fuente: Curipod citando Chen et al., 2024]

2. **El antídoto es "source-grounded generation", no mejor prompting.** El paper EDM 2024 de Oxford/Rising Academies/Utah demuestra que **RAG con texto del libro de texto** mejora dramáticamente la calidad, **pero hay un trade-off de groundedness vs. preferencia humana**: demasiado apego al texto = el alumno siente que está leyendo el manual. Hay que medir ambas dimensiones.

3. **La cadena M0a → M1a → M1b es correcta, pero falta el motor M0.5 "Source Extractor".** El patrón ganador (Solaiman et al. 2024, multi-agent story generation con Crew AI) usa 4 agentes especializados: **Story Writer → Character Detailer → Director → Editor**. Mapear a PRIA: M0=Concept Extractor, **M0.5=Source Narrator** (extrae narrativa del texto), M1a=Lesson Planner, M1b=Slide Builder.

4. **Few-shot prompting con ejemplos handcrafted es la palanca más barata.** Los papers Khan Academy (Kelli Hill, 2026), "Prompt Engineering for Educational Content" (McNulty 2023) y AI-Generated Lecture Slides (arXiv 2506.23605) demuestran que **3-5 ejemplos completos del output deseado** en el system prompt elevan la calidad narrativa más que cualquier otra técnica.

5. **El "contexto" es más importante que el "prompt".** Anthropic (Sep 2025) — *"Context engineering is the natural progression of prompt engineering... finding the smallest possible set of high-signal tokens"* — recomienda tratar el contexto como un presupuesto finito de atención. Para PRIA: inyectar **extractos específicos del texto fuente** al motor M1b, no el texto completo.

6. **El benchmark PresentBench (Tsinghua, 2026) es directamente relevante.** Evalúa decks de slides con **54.1 checklist items por instancia** sobre material fuente. Revela que incluso NotebookLM (líder, 62.5%) falla en **Content Fidelity (45.1%)** — confirma que sin source-grounding el contenido se inventa.

7. **Medir "riqueza narrativa" requiere rubrics instance-specific, no BLEU/ROUGE.** Adoptar el patrón PresentBench: generar un checklist de hechos verificables por slide a partir del texto fuente, y rechazar cualquier slide que no los cubra.

---

## 1. Content-rich LLM generation para educación

### 1.1 Cómo lo hacen los líderes EdTech

**Khan Academy (Khanmigo)** — Pilares revelados por Kelli Hill (Conferencia Experimentation Island, Feb 2026):

> "We assembled a team of PhDs in education to define what good tutoring actually looks like, then had human raters apply that rubric to chat transcripts, targeting 85% inter-rater agreement."

- **Estrategia:** Base de contenido curado (artículos, ejercicios) + GPT-4/5 + **LLM-as-judge** entrenado con ground truth humano + A/B testing continuo (64 experimentos completados, 29 en curso).
- **Por qué funciona:** Khan Academy **NO le pide al LLM que invente contenido**. Lo usa para mediar entre el estudiante y su propia biblioteca curada. El LLM no es la fuente, es el intérprete.
- **Implicación para PRIA:** No usar M1b como "autor", sino como "intérprete del texto fuente del docente". [Fuente: GrowthBook Blog, Mar 2026](https://www.growthbook.io/blog/how-khan-academy-optimizes-ai-tutoring-with-experimentation)

**MagicSchool AI** (5M+ usuarios docentes en US, 2026):
- 80+ tools específicos (no un solo prompt genérico).
- Plus tier ($8.33/teacher/mo) incluye **AI editing** + **output history** = iteración asistida.
- **Lección para PRIA:** No intentar un "mega-motor"; tener motores especializados por tipo de output (slides ≠ quiz ≠ plan). [Fuente: Fora Soft, Jun 2026](https://www.forasoft.com/blog/article/automated-lesson-plan-generation-software)

**Curipod** (May 2025) — Enfoque explícito al problema de PRIA:
- Curipod se posiciona contra el problema de Chen et al.: *"AI reflects the average, not the visionary"*.
- Su solución: **backward design activado por intención** (Teach Something New / Reteach & Review / Practice a Skill) — cada tipo activa una estructura pedagógica distinta (Gradual Release, UDL, Checks for Understanding).
- **Lección para PRIA:** El prompt al M1b debe incluir el **tipo de lección** (introducción / refuerzo / práctica) y eso debe cambiar la estructura, no solo el contenido. [Fuente: Curipod Blog, May 2025](https://curipod.com/c/blog-posts/the-problem-with-ai-lesson-plans-and-how-curipod-is-different)

**Diffit** — La prueba de que RAG con texto fuente es el camino:
- Input: cualquier texto (URL, PDF, párrafo).
- Output: versiones adaptadas al nivel de lectura + vocabulario + preguntas de comprensión en <30s.
- Lo que hace diferente: **el texto es la única fuente de verdad**, no el conocimiento del LLM.
- **Lección directa para PRIA:** Esto es exactamente lo que M1b debería hacer con el capítulo del libro de texto del docente. [Fuente: Fora Soft comparison](https://www.forasoft.com/blog/article/automated-lesson-plan-generation-software)

### 1.2 Por qué los LLMs producen "metadatos" en vez de narrativa

El paper **PresentBench** (Chen et al., Tsinghua, 2026, arXiv 2603.07244) lo diagnostica con precisión:

> "The primary difficulty lies in long-context distillation: inputs average 22.2k tokens (approximately 34 pages), requiring models to read, select, synthesize, and organize information across many dispersed facts."

> "Content Completeness is notably higher than Correctness, meaning systems often build structure but frequently make factual mistakes."

**Diagnóstico:** El LLM es bueno construyendo la **estructura del slide** (objetivo, definición, actividad) pero no logra **transferir los hechos específicos** del material fuente. Replica patrones estructurales que vio en sus datos de entrenamiento — y esos patrones son los "metadatos".

**Implicación para PRIA:** El problema NO es el modelo, es que el motor M1b no recibe suficiente información factual específica del tema. Recibe el nombre del tema, pero no el texto del capítulo. [Fuente: PresentBench, 2026](https://presentbench.github.io/)

---

## 2. Multi-agent content chains (M0a → M1a → M1b)

### 2.1 El patrón correcto: 4 agentes especializados

**Solaiman, Maria & Milanova (Univ. Arkansas at Little Rock, Sep 2024)** en *"Educational content generation using multi-LLM agents"* — publicado en International Robotics & Automation Journal — formalizan exactamente el patrón que PRIA necesita:

> "Leveraging the Crew AI framework, the system coordinates multiple autonomous agents, each with specific roles, to produce cohesive educational materials."

| Agente | Rol | Output | Prompt típico |
|--------|-----|--------|---------------|
| **Story Writer** | Genera borrador inicial | Narrativa cruda con moraleja | *"Write a children's story based on: [idea]. Include a strong moral lesson and meaningful dialogue."* |
| **Character Detailer** | Enriquece personajes | Descripciones físicas, personalidad, roles | *"Given the story: [story], provide detailed descriptions of main characters..."* |
| **Director** | Crea escenas visuales | Atmósfera, ángulos de cámara, mood | *"Create vivid scene descriptions for a video adaptation, including key locations, atmosphere, mood..."* |
| **Editor** | Refina y valida | Versión final coherente | *"Review the draft for plot coherence, age-appropriateness, narrative flow..."* |

[Fuente: Solaiman et al., 2024 — IRATJ Vol 10(3)](https://medcraveonline.com/IRATJ/educational-content-generation-using-multi-llm-agents.html)

### 2.2 Mapeo a PRIA v10 (propuesta)

El pipeline actual es `M0a (conceptos) → M1a (plan) → M1b (slides)`. Le falta el paso crítico:

```
INPUT: tema + nivel + texto_fuente (capítulo del libro)
        │
        ├─→ M0a  Concept Extractor       [YA EXISTE]
        │     Output: {conceptos[], objetivos[], vocabulario[]}
        │
        ├─→ M0.5 Source Narrator         [NUEVO — CRÍTICO]
        │     Input: texto_fuente + conceptos
        │     Output: {narrativa_personajes[], eventos_secuencia[],
        │               ejemplos_concretos[], contexto_cultural[]}
        │     Función: extrae la historia real, NO la invierte
        │
        ├─→ M1a  Lesson Plan Generator    [YA EXISTE]
        │     Input: M0a + M0.5
        │     Output: plan estructurado (inicio/desarrollo/cierre)
        │
        ├─→ M1b  Slide Script Generator  [YA EXISTE — debe cambiar]
        │     Input: M0a + M0.5 + M1a
        │     Output: 10 slides con contenido narrativo REAL
        │
        └─→ M0.6 Quality Judge           [NUEVO]
              Input: M1b output + texto_fuente
              Output: {score_contenido, score_grounding, gaps[]}
              Función: verifica que cada slide cita hechos del texto
```

### 2.3 Patrones de arquitectura (LangChain, Jan 2026)

Sydney Runkle en LangChain formaliza 4 patrones multi-agente y mide su rendimiento. Para PRIA el patrón adecuado es **Subagents** (centralized orchestration):

> "Anthropic's multi-agent research system... outperformed single-agent Claude Opus 4 by 90.2% on internal research evaluations. The architecture's ability to distribute work across agents with separate context windows enabled parallel reasoning that a single agent couldn't achieve."

Comparación de patrones para nuestro caso (una query, muchos dominios):

| Patrón | Latencia | Tokens | Apto para PRIA |
|--------|----------|--------|----------------|
| **Subagents** | +1 llamada | bajo (context isolation) | ✅ **Recomendado** — M0a, M0.5, M1a, M1b como subagentes del orquestador |
| Skills | bajo | alto (context acumula) | ❌ Riesgo de bloated prompt |
| Handoffs | medio | medio | ❌ Requiere stateful — overkill |
| Router | bajo | bajo | ❌ Mejor para multi-vertical (chatbots multi-tema) |

[Fuente: LangChain Blog, Jan 2026](https://www.langchain.com/blog/choosing-the-right-multi-agent-architecture)

---

## 3. Source-grounded content (RAG con libro de texto)

### 3.1 El paper clave: EDM 2024 de Oxford

**Henkel, Levonian, Postle & Li (Oxford / Rising Academies / Utah, 2024)** — *"Retrieval-augmented Generation to Improve Math Question-Answering: Trade-offs Between Groundedness and Human Preference"*:

> "We designed prompts that retrieve and use content from a high-quality open-source math textbook to generate responses to real student questions."

> **Hallazgo central:** "Humans prefer responses generated using RAG, **but not when responses are too grounded in the textbook content**."

**Traducción práctica para PRIA:**
- **Groundedness** = qué tanto el slide refleja el texto fuente (↑ mejor para fidelidad curricular).
- **Human preference** = qué tanto el slide es legible, contextualizado, interesante para el alumno (↓ si es muy literal).

**El sweet spot:** Adaptar el lenguaje del texto fuente, no copiarlo. Por ejemplo:
- ❌ Slide generado con RAG literal: *"Cuenta la tradición oral que en tiempos antiguos, una mujer indígena caminaba por la selva..."*
- ✅ Slide generado con RAG adaptado: *"Una mujer indígena caminaba por la selva hace mucho tiempo. ¿Qué encontró en su camino? Hoy conoceremos esta tradición oral..."*

[Fuente: EDM 2024 Short Papers](https://educationaldatamining.org/edm2024/proceedings/2024.EDM-short-papers.28/index.html)

### 3.2 Pipeline RAG para PRIA

```
Texto fuente (capítulo del libro, ~5-20 páginas)
        │
        ├─→ Chunking semántico (secciones por sub-tema)
        │
        ├─→ Embeddings + Index (pgvector / ChromaDB)
        │
        └─→ Query: M1b pide "narrativa sobre [concepto]"
                │
                └─→ Top-3 chunks relevantes (no el texto completo)
                        │
                        └─→ Inyectados al prompt de M1b:
                              "Basándote en este extracto del libro:
                               [chunk1]
                               [chunk2]
                               Genera un slide para 5to de primaria..."
```

**Por qué no el texto completo:** Anthropic (Sep 2025) — *"context rot: as the number of tokens in the context window increases, the model's ability to accurately recall information from that context decreases"*. Para PRIA: **3-5k tokens de chunks relevantes** >> 20k tokens del libro completo.

[Fuente: Anthropic Context Engineering, Sep 2025](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### 3.3 In-context learning vs RAG — cuándo cada uno

| Técnica | Cuándo usar | Cómo |
|---------|-------------|------|
| **Few-shot en system prompt** | Siempre — barato, rápido | 3-5 ejemplos completos del output deseado |
| **RAG con retrieval** | Cuando hay texto fuente extenso (>10 páginas) | Chunking + embeddings + query |
| **Fine-tuning** | Solo si el formato de output es muy específico y se repite | Caro, overkill para 5to primaria |

Para PRIA: **few-shot + RAG** es la combinación óptima. Fine-tuning es innecesario a esta escala.

---

## 4. Prompt patterns para contenido narrativo rico

### 4.1 El anti-pattern: "describe un tema"

```markdown
❌ MALO — produce metadatos:
"Genera un slide sobre 'Guede pinta los animales'.
Objetivo: Conocer la tradición oral.
Concepto: Los animales no tenían colores.
Actividad: Dibujar animales."
```

Por qué falla: el LLM completa el template estructural sin saber qué llenar.

### 4.2 El patrón correcto: "cuenta la historia"

```markdown
✅ BUENO — produce narrativa:

ERES: Cuentacuentos indígena de tradición oral boliviana para niños de 5to de primaria.

TAREA: Cuéntame la historia de 'Guede pinta los animales' como si se la explicaras
a un niño de 10 años en clase, usando el estilo del extracto del libro a continuación.

EXTRACTO DEL LIBRO DE TEXTO:
"<chunk con la narrativa real del mito>"

ESTRUCTURA DEL SLIDE (10 slides):
- Slide 1: Título + pregunta generadora (¿Por qué los animales tienen colores?)
- Slide 2: Personajes principales (presentar a Guede, dónde vive, qué hace)
- Slide 3: Situación inicial (cómo era el mundo ANTES — sin colores)
- Slide 4: El problema / conflicto (por qué hay que pintar a los animales)
- Slide 5-7: La secuencia de eventos (3 momentos clave de la historia)
- Slide 8: El resultado (cómo terminó — animales pintados)
- Slide 9: Conexión cultural (por qué importa esta historia para nosotros)
- Slide 10: Actividad + reflexión

REGLAS NARRATIVAS:
1. Cada slide con personajes DEBE incluir una acción concreta del personaje.
2. Los eventos DEBEN tener secuencia (primero → después → finalmente).
3. Los ejemplos DEBEN incluir detalles sensoriales (colores, sonidos, lugares).
4. PROHIBIDO usar frases como "concepto:", "objetivo:", "definición:" —
   estos son metadatos, no narrativa.
5. Cada slide debe tener al menos un hecho ESPECÍFICO del extracto.

OUTPUT FORMAT (JSON estricto):
{
  "slides": [
    {"num": 1, "tipo": "titulo_pregunta", "contenido": "...", "hechos_fuente": ["..."]},
    ...
  ]
}
```

### 4.3 Técnicas adicionales validadas

**A) Few-shot con ejemplos handcrafted (McNulty, 2023):**
> "Providing examples, otherwise known as few-shot prompting, is a well known best practice that we continue to strongly advise."

Para PRIA: incluir en el system prompt **2-3 ejemplos completos de slides buenos** (los handcrafted de referencia) y **1 ejemplo de slide malo** con anotación *"NO hagas esto"*.

[Fuente: Prompt Engineering for Educational Content, Niall McNulty, Sep 2023](https://www.linkedin.com/pulse/prompt-engineering-education-content-few-shot-niall-mcnulty)

**B) Chain-of-Thought for content generation:**
Hacer que el LLM piense ANTES de generar el slide:

```markdown
Antes de generar el slide, razona paso a paso:
1. ¿Cuál es el hecho central del extracto?
2. ¿Qué personajes están involucrados?
3. ¿Cuál es la secuencia de eventos?
4. ¿Qué detalle sensorial puedo incluir?
5. ¿Qué conexión cultural puedo hacer para 5to de primaria?

Ahora genera el slide basándote en este razonamiento.
```

[Fuente: Chain-of-Thought Prompting — PromptHub, Splunk](https://www.splunk.com/en_us/blog/learn/chain-of-thought-cot-prompting.html)

**C) "Story Skeleton" pattern (de Solaiman 2024):**
Para historias/mitos, descomponer en `Personaje + Deseo + Conflicto + Resolución` antes de generar cada slide.

**D) Negative prompting — decir qué NO hacer:**
Anthropic recomienda explícitamente: *"We recommend working to curate a set of diverse, canonical examples that effectively portray the expected behavior of the agent."* Para PRIA: ejemplos negativos son igual de importantes que positivos.

[Fuente: Anthropic Context Engineering, Sep 2025](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### 4.4 JSON estructurado + validación (OpenAI Structured Outputs, 2024)

Para PRIA, generar output en JSON schema estricto permite:
- Validación automática de completitud.
- Extracción confiable de campos para el render PPTX.
- LLM-as-judge sobre campos específicos.

```python
class SlideContent(BaseModel):
    num: int
    tipo: Literal["titulo", "narrativa", "actividad", "cierre"]
    titulo: str = Field(description="Título engaging, pregunta o frase corta")
    cuerpo: str = Field(description="Narrativa con personajes, eventos, detalles. Mínimo 2 oraciones.")
    datos_visuales: str = Field(description="Qué imagen/diagrama acompañaría")
    fuente_hechos: list[str] = Field(description="Hechos específicos del texto fuente que este slide cubre")
```

[Fuente: OpenAI Structured Outputs Docs](https://developers.openai.com/api/docs/guides/structured-outputs)

---

## 5. Benchmarks y métricas de calidad

### 5.1 El benchmark ideal para PRIA: PresentBench (Chen et al., Tsinghua 2026)

Paper: *"PresentBench: A Fine-Grained Rubric-Based Benchmark for Slide Generation"* (arXiv 2603.07244)

**Lo que hacen:**
1. Por cada instancia (ej: "genera slides sobre este paper / capítulo"), un humano experto escribe **~54 checklist items binarios** (sí/no, ¿el slide menciona X hecho?).
2. Un LLM-as-judge evalúa cada checklist item por separado.
3. Score = % de items satisfied.

**Las 5 dimensiones evaluadas:**

| Dimensión | Qué mide | Ejemplo checklist item |
|-----------|----------|------------------------|
| Presentation Fundamentals | Estructura, lógica, flow | "¿La slide 1 introduce el tema?" |
| Visual Design & Layout | Diseño, jerarquía visual | "¿Los bullets no exceden 6 por slide?" |
| Content Completeness | Cobertura de hechos | "¿Se mencionan los 3 personajes principales?" |
| Content Correctness | Hechos correctos | "¿La fecha del evento X es 1781, no 1881?" |
| Content Fidelity | Apego al material fuente | "¿La afirmación en slide 5 está en el material?" |

**Hallazgo clave para PRIA:**
> "Content Fidelity also remains challenging even for strong systems (e.g., NotebookLM 45.1, Manus 45.4), pointing to persistent ungrounded details and hallucinations."

NotebookLM, el líder del benchmark, **igual falla en fidelidad al material fuente 55% de las veces**. Esto confirma que el problema que tiene PRIA es endémico de la industria — y que medirlo requiere rubrics instance-specific, no métricas genéricas.

[Fuente: PresentBench Project Page](https://presentbench.github.io/) | [Paper PDF](https://arxiv.org/html/2603.07244v1)

### 5.2 Patrón de evaluación propuesto para PRIA

Adoptar el patrón PresentBench **a pequeña escala** para validar la calidad del output de M1b:

```python
# Por cada slide generado, generar checklist del texto fuente
fuente_hechos = [
  "Guede es una mujer indígena",  # hecho_1 del texto
  "Guede camina por la selva",
  "Los animales no tenían colores antes",
  "Guede usa pinturas naturales",
  "El jaguar recibe el color verde",
  ...
]

# Para cada slide, el LLM-as-judge responde:
# "¿El slide <N> menciona o refleja el hecho <X>?"
# Score = hechos cubiertos / hechos totales
```

**Métricas concretas que PRIA debería trackear:**

| Métrica | Target | Cómo medir |
|---------|--------|------------|
| **Hechos cubiertos** | >80% de hechos del texto fuente presentes en slides | LLM-as-judge con checklist |
| **Factualidad** | <5% de "hechos inventados" (no en fuente) | Comparar slide vs. texto fuente |
| **Personajes nombrados** | 100% de personajes principales del texto aparecen | Regex + LLM-judge |
| **Secuencia narrativa** | Eventos en orden cronológico correcto | LLM-judge con timeline |
| **Detalles sensoriales** | ≥1 detalle sensorial por slide narrativo | LLM-judge (colores, sonidos, lugares) |
| **Conexión cultural** | ≥1 referencia cultural explícita cuando aplica | LLM-judge |

### 5.3 El "LLM-as-judge" requiere ground truth (Khan Academy lesson)

Khan Academy gastó meses con PhDs en educación + 85% inter-rater agreement **antes** de poder usar LLM-as-judge confiablemente:

> "Many teams spin up LLM-as-judge systems with no ground truth, resulting in unreliable results. Khan Academy invested in the hard work of human annotation first. Once the machine matched human accuracy, they scaled it to process thousands of interactions nightly."

**Implicación para PRIA:** Antes de automatizar la evaluación de calidad, **validar manualmente 30-50 outputs de M1b** con el handcrafted reference como gold standard. Solo después automatizar.

[Fuente: GrowthBook Blog sobre Khan Academy, Mar 2026](https://www.growthbook.io/blog/how-khan-academy-optimizes-ai-tutoring-with-experimentation)

---

## 6. Recomendaciones accionables para PRIA v10

### Tier 1 — Implementar esta semana (alto impacto, bajo costo)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | **Few-shot en el system prompt de M1b** — incluir 2-3 slides handcrafted como ejemplos + 1 slide malo anotado | 2 horas | Alto |
| 2 | **JSON schema estructurado** para output de M1b con campo `fuente_hechos: []` por slide | 4 horas | Alto |
| 3 | **Negative prompting** — "PROHIBIDO generar 'Concepto:', 'Objetivo:', 'Definición:' sin contenido narrativo" | 1 hora | Alto |
| 4 | **Chain-of-thought interno** — pedir al LLM que razone hechos/personajes/secuencia ANTES de generar el slide | 2 horas | Alto |

### Tier 2 — Implementar este sprint (medio esfuerzo, alto impacto)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 5 | **Nuevo motor M0.5 Source Narrator** — extrae narrativa/personajes/eventos del texto fuente | 1-2 días | Crítico |
| 6 | **RAG básico** — chunking del texto del capítulo + top-3 retrieval por concepto | 2-3 días | Crítico |
| 7 | **Prompt por tipo de lección** — backward design: introducción / refuerzo / práctica (patrón Curipod) | 1 día | Medio |
| 8 | **Checklist de validación** — para cada slide generado, verificar que cubre hechos del texto | 1 día | Alto |

### Tier 3 — Implementar próximo sprint (alto esfuerzo, alto impacto)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 9 | **Motor M0.6 Quality Judge** — LLM-as-judge con ground truth de slides handcrafted | 3-5 días | Alto |
| 10 | **Migrar a multi-agente** — orquestador M0 que llama M0a, M0.5, M1a, M1b como subagentes | 1 semana | Medio (refactor) |
| 11 | **A/B testing en producción** — medir qué versión de prompt produce slides más ricos (patrón Khan Academy) | Continuo | Alto |
| 12 | **Compaction de contexto** — para capítulos largos, resumir chunks antes de inyectar (patrón Anthropic) | 2-3 días | Medio |

### Tier 4 — Investigación (largo plazo)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 13 | **Evaluar NotebookLM / Curipod como benchmarks externos** — comparar slides de PRIA con los suyos | 1 semana | Estratégico |
| 14 | **Estudio con docentes bolivianos** — ground truth manual sobre 50 outputs de M1b | 2 semanas | Estratégico |
| 15 | **Validación cultural** — invitar a un antropólogo/educador indígena a auditar slides sobre mitos | Continuo | Ético |

---

## 7. Ejemplo concreto: antes y después

### ❌ ANTES (lo que genera PRIA actualmente)

```json
{
  "slide_1": {
    "titulo": "Guede pinta los animales",
    "objetivo": "Conocer la tradición oral sobre el origen de los colores de los animales",
    "concepto": "Los animales no tenían colores en el principio de los tiempos",
    "actividad": "Dibujar un animal sin color"
  },
  "slide_2": {
    "titulo": "Los personajes",
    "objetivo": "Identificar al personaje principal",
    "concepto": "Guede es la protagonista",
    "actividad": "Subrayar el nombre en el texto"
  }
}
```

**Diagnóstico:** Metadatos puros. No hay narrativa, ni personajes con rasgos, ni secuencia, ni detalles.

### ✅ DESPUÉS (lo que debería generar M1b con las mejoras Tier 1+2)

```json
{
  "slide_1": {
    "tipo": "pregunta_generadora",
    "titulo": "¿Alguna vez te preguntaste por qué el jaguar es amarillo con manchas negras?",
    "contenido": "Hoy vamos a conocer una historia muy antigua que nuestros pueblos cuentan para explicar algo curioso: los colores de los animales. Según la tradición oral de nuestro pueblo, antes no había colores en la selva. ¿Te imaginas cómo sería?",
    "imagen_sugerida": "Selva en blanco y negro, con un jaguar sin color"
  },
  "slide_2": {
    "tipo": "presentacion_personajes",
    "titulo": "Conozcamos a Guede",
    "contenido": "Guede es una mujer sabia de nuestro pueblo que vive cerca del río. Ella conoce las plantas de la selva como nadie y sabe sacar colores de las raíces, las hojas y las flores. Un día, Guede notó algo que le preocupó mucho: los animales de la selva se confundían entre las hojas porque todos eran del mismo color gris.",
    "datos_visuales": "Retrato de Guede, mujer indígena con vestimenta tradicional",
    "hechos_fuente": ["Guede es mujer indígena", "Vive cerca del río", "Conoce plantas de la selva", "Saca colores de raíces, hojas y flores"]
  },
  "slide_3": {
    "tipo": "secuencia_evento_1",
    "titulo": "El problema en la selva",
    "contenido": "Antes de que Guede interviniera, los animales no tenían colores. El jaguar se tropezaba con los venados, las serpientes se enredaban con las lianas, y los pájaros no podían encontrar a sus parejas. La selva era un lugar peligroso y confuso para todos.",
    "hechos_fuente": ["Los animales no tenían colores antes", "El jaguar se tropezaba con los venados", "Las serpientes se confundían con las lianas"]
  }
}
```

**Diagnóstico:** Hay narrativa, personajes con rasgos, secuencia (antes → Guede interviene → animales pintados), detalles sensoriales (raíces, hojas, flores), conexión cultural (la tradición oral de nuestro pueblo).

---

## 8. Referencias completas

### Papers académicos

1. **Solaiman, I.A., Maria, T.S., Milanova, M. (2024).** *Educational content generation using multi-LLM agents.* International Robotics & Automation Journal, 10(3), 85-87. DOI: 10.15406/iratj.2024.10.00288. https://medcraveonline.com/IRATJ/educational-content-generation-using-multi-llm-agents.html — **Defines the 4-agent pattern (Story Writer / Character Detailer / Director / Editor) using Crew AI.**

2. **Henkel, O., Levonian, Z., Postle, M-E., Li, C. (2024).** *Retrieval-augmented Generation to Improve Math Question-Answering: Trade-offs Between Groundedness and Human Preference.* EDM 2024 Short Papers. https://educationaldatamining.org/edm2024/proceedings/2024.EDM-short-papers.28/index.html — **Demonstrates RAG with textbooks, but warns about over-grounding.**

3. **Chen, B., Cheng, J., Wang, C., Leung, V. (2024).** *The Hidden Curriculum of AI Lesson Plans.* OSF Preprints (University of Pennsylvania & University of Michigan). Cited by Curipod Blog — **Diagnoses the exact problem PRIA has: AI produces structurally correct but pedagogically passive content.**

4. **Chen, X-S., Zhu, J., Li, P-l., Wang, H., Yang, S., Guo, M-H. (2026).** *PresentBench: A Fine-Grained Rubric-Based Benchmark for Slide Generation.* arXiv:2603.07244. https://presentbench.github.io/ — **Direct benchmark for our exact problem: evaluating slide decks against source material with 54-item checklists per instance.**

5. **Siro, C. et al. (2026).** *LLMs Designing and Applying Evaluation Rubrics (GER-Eval).* Findings of EACL. https://aclanthology.org/2026.findings-eacl.335.pdf — **LLM-as-judge with auto-generated rubrics.**

6. **Anthropic Engineering Team (Sep 2025).** *Effective context engineering for AI agents.* https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — **Defines context rot, the attention budget, and just-in-time retrieval patterns.**

7. **Runkle, S. (Jan 2026).** *Choosing the Right Multi-Agent Architecture.* LangChain Blog. https://www.langchain.com/blog/choosing-the-right-multi-agent-architecture — **Quantitative comparison of 4 multi-agent patterns; Subagents recommended for our case.**

### EdTech industry

8. **Hill, K. (Feb 2026) / Stirrup, A. (Mar 2026).** *How Khan Academy optimizes AI tutoring with experimentation.* GrowthBook Blog. https://www.growthbook.io/blog/how-khan-academy-optimizes-ai-tutoring-with-experimentation — **The 4-phase evolution (intuition → manual → automated eval → A/B test) and the LLM-as-judge + ground truth requirement.**

9. **Curipod Team (May 22, 2025).** *The Problem with AI Lesson Plans—And How Curipod Is Different.* https://curipod.com/c/blog-posts/the-problem-with-ai-lesson-plans-and-how-curipod-is-different — **Backward design pattern (Teach / Reteach / Practice) and Chen et al. critique.**

10. **Fora Soft (Jun 26, 2025; updated Mar 2026).** *7 Best AI Tools for Lesson Plan Generation in 2026.* https://www.forasoft.com/blog/article/automated-lesson-plan-generation-software — **Comparison of MagicSchool, Diffit, Curipod, Eduaide, Brisk, Education Copilot, Khanmigo with architecture details.**

### Prompt engineering & LLM technique

11. **McNulty, N. (Sep 12, 2023).** *Prompt Engineering for Educational Content: Few-Shot and Chain-of-Thought.* LinkedIn. https://www.linkedin.com/pulse/prompt-engineering-education-content-few-shot-niall-mcnulty — **Direct application of CoT + few-shot to K-12 content.**

12. **OpenAI. (2024-2026).** *Structured model outputs.* https://developers.openai.com/api/docs/guides/structured-outputs — **JSON schema validation for LLM outputs.**

13. **IBM Research (Aug 2023).** *What is retrieval-augmented generation (RAG)?* https://research.ibm.com/blog/retrieval-augmented-generation-RAG

### Cultural context

14. **The Conversation (Mar 3, 2026).** *AI has powerful uses for First Nations oral cultural knowledge — here's how.* https://theconversation.com/ai-has-powerful-uses-for-first-nations-oral-cultural-knowledge-heres-how-276043 — **Validation that LLMs can help preserve oral traditions when properly grounded.**

15. **Tribal College Journal (Nov 2024).** *Technology as Tradition: How LLMs Can Preserve and Promote Indigenous Cultures.* https://tribalcollegejournal.org/technology-as-tradition-how-llms-can-preserve-and-promote-indigenous-cultures/ — **Confirms our use case is ethically supported when content is community-validated.**

---

## Anexo: Código de ejemplo para el nuevo motor M0.5

```typescript
// server/motors/M0_5_SourceNarrator.ts
import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const NarrativaSchema = z.object({
  personajes: z.array(z.object({
    nombre: z.string(),
    rol: z.enum(["protagonista", "antagonista", "ayudante", "espectador"]),
    rasgos: z.array(z.string()).min(2),
    acciones_clave: z.array(z.string()).min(1)
  })),
  eventos_principales: z.array(z.object({
    orden: z.number(),
    descripcion: z.string(),
    personajes_involucrados: z.array(z.string())
  })).min(3),
  contexto_cultural: z.object({
    origen_tradicion: z.string(),
    pueblo_etnia: z.string().optional(),
    significado_actual: z.string()
  }),
  ejemplos_concretos: z.array(z.object({
    concepto: z.string(),
    caso_del_texto: z.string(),
    detalle_sensorial: z.string().optional()
  })).min(3),
  moraleja_o_leccion: z.string()
});

export async function extractNarrativa(
  textoFuente: string,
  tema: string,
  nivel: string
) {
  const client = new OpenAI();
  
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Eres un antropólogo y educador especializado en tradiciones orales 
de pueblos indígenas de Bolivia. Tu trabajo es extraer la NARRATIVA REAL 
de un texto fuente, no inventar contenido. Nivel educativo: ${nivel}.

REGLA CRÍTICA: Si un dato no está en el texto fuente, NO lo inventes. 
Si el texto no contiene suficiente información para un campo, déjalo vacío 
o marca explícitamente "no especificado en el texto".`
      },
      {
        role: "user",
        content: `TEXTO FUENTE DEL LIBRO:
"""
${textoFuente}
"""

TEMA: ${tema}

Extrae la narrativa siguiendo el schema JSON. Cada personaje debe tener 
al menos 2 rasgos y 1 acción concreta del texto. Cada evento debe estar 
en el texto fuente (cita la frase relevante).`
      }
    ],
    response_format: zodResponseFormat(NarrativaSchema, "narrativa")
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

---

**Próximo paso sugerido:** Implementar Tier 1 (4 cambios de prompt, 1 día) + M0.5 con RAG básico (Tier 2 #5, #6, 3 días), luego validar contra 10 slides handcrafted existentes antes de iterar.