"""
Motor M1a Service - 45-minute Lesson Plan Generator
Generates detailed lesson plans with Inicio, Desarrollo, Cierre momentos
"""
import json
from typing import Optional, List, Dict, Any
import google.generativeai as genai
from app.services.errors import GeminiAPIError


class MotorM1aService:
    """Service for generating 45-minute lesson plans using Gemini API."""

    MOTOR_M1A_PROMPT = """You are an expert curriculum designer creating a 45-minute lesson plan using the MESCP (Modelo Educativo Socio-Crítico Progresista) framework.

Your task is to generate a structured lesson plan with THREE momentos (learning phases):
1. INICIO (15 minutes): Activation, prior knowledge review, motivation
2. DESARROLLO (20 minutes): Core content delivery, activities, practice
3. CIERRE (10 minutes): Synthesis, assessment, reflection

INPUT PARAMETERS:
- Grade Level: {grado_nivel}
- Main Topic/Theme: {tema_clase}
- Key Concepts: {conceptos_clave}
- Keywords: {palabras_clave}
- Suggested Multiple Intelligences: {inteligencias_sugeridas}
- Student Diagnoses/Profiles: {diagnosticos}
- General Objective: {objetivo_general}
- Textbook Pages (if any): {pag_tb}
- Supplementary Pages: {pag_sb}
- Additional Teacher Notes: {user_suggestions}

REQUIRED OUTPUT (JSON):
{{
  "mapa_cognitivo": "A visual learning map showing concept relationships (describe as text)",
  "inteligencias_multiples": ["List of activated intelligences from Inicio/Desarrollo/Cierre"],
  "secuencia_didactica": {{
    "inicio": {{
      "nombre": "Inicio",
      "duracion_minutos": 15,
      "descripcion": "Detailed activities for the INICIO phase (activation, motivation, prior knowledge)",
      "recursos": ["List of materials/resources needed"],
      "evaluacion": "Quick formative assessment for INICIO phase"
    }},
    "desarrollo": {{
      "nombre": "Desarrollo",
      "duracion_minutos": 20,
      "descripcion": "Core teaching strategies, practice activities, examples (80-120 words)",
      "recursos": ["Materials, worksheets, manipulatives, technology"],
      "evaluacion": "Formative checks during development (questioning, observation)"
    }},
    "cierre": {{
      "nombre": "Cierre",
      "duracion_minutos": 10,
      "descripcion": "Synthesis, summary, exit ticket, reflection questions (40-60 words)",
      "recursos": ["Assessment tools or reflection prompts"],
      "evaluacion": "Quick assessment of learning: exit ticket or group reflection"
    }}
  }},
  "dua_neuroinclusion": {{
    "principio_1_representacion": "How content is presented to support multiple modalities",
    "principio_2_accion_expresion": "Action/expression options for students with different abilities",
    "principio_3_motivacion_engagement": "Strategies to engage all learners, especially those with ADHD/TEA"
  }},
  "tabla_adaptaciones": {{
    "dislexia": "Specific adaptations for dyslexic students",
    "adhd": "Color-coding, movement breaks, clear instructions",
    "tea": "Predictable structure, visual schedules, explicit transitions",
    "dyscalculia": "Concrete manipulatives, color-coded numbers, tens frames"
  }}
}}

CRITICAL REQUIREMENTS:
1. Keep INICIO under 15 minutes (activating prior knowledge, not extensive teaching)
2. DESARROLLO is the main content delivery (20 min) - most detailed
3. CIERRE must assess learning (10 min) - not just summary
4. All recursos must be realistic and available in schools
5. Ensure alignment with MESCP (social-critical, progressive model)
6. Include concrete examples from {grado_nivel} context
7. Make it immediately usable by teachers
8. If student profiles include autism or ADHD, emphasize predictability and movement
9. Return ONLY valid JSON, no markdown code blocks

Generate the lesson plan now."""

    def __init__(self):
        """Initialize Motor M1a service with Gemini client."""
        try:
            genai.configure(api_key=self._get_api_key())
        except Exception as e:
            raise GeminiAPIError(f"Failed to initialize Gemini: {str(e)}")

    @staticmethod
    def _get_api_key() -> str:
        """Get Gemini API key from environment."""
        import os
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise GeminiAPIError("GEMINI_API_KEY not configured")
        return api_key

    async def generate_lesson_plan(
        self,
        grado_nivel: str,
        tema_clase: str,
        conceptos_clave: List[str],
        palabras_clave: List[str],
        inteligencias_sugeridas: List[str],
        diagnosticos: List[str],
        objetivo_general: str,
        pag_tb: Optional[str] = None,
        pag_sb: Optional[str] = None,
        user_suggestions: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a complete 45-minute lesson plan.

        Args:
            grado_nivel: Grade level (e.g., "5to Primaria")
            tema_clase: Main theme/topic
            conceptos_clave: List of key concepts
            palabras_clave: List of keywords
            inteligencias_sugeridas: Suggested multiple intelligences
            diagnosticos: Student profiles/diagnoses
            objetivo_general: General learning objective
            pag_tb: Textbook pages (optional)
            pag_sb: Supplementary pages (optional)
            user_suggestions: Additional teacher notes (optional)

        Returns:
            Structured lesson plan dict with momentos, DUA, etc.
        """
        # Build the prompt
        prompt = self.MOTOR_M1A_PROMPT.format(
            grado_nivel=grado_nivel,
            tema_clase=tema_clase,
            conceptos_clave=", ".join(conceptos_clave),
            palabras_clave=", ".join(palabras_clave),
            inteligencias_sugeridas=", ".join(inteligencias_sugeridas),
            diagnosticos=", ".join(diagnosticos) if diagnosticos else "General education",
            objetivo_general=objetivo_general,
            pag_tb=pag_tb or "N/A",
            pag_sb=pag_sb or "N/A",
            user_suggestions=user_suggestions or "None"
        )

        try:
            # Call Gemini API
            model = genai.GenerativeModel("gemini-2.0-flash", system_prompt="")
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    top_p=0.9,
                    max_output_tokens=2000
                )
            )

            # Parse response
            response_text = response.text.strip()

            # Handle markdown code blocks if present
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            lesson_plan = json.loads(response_text)

            # Validate and structure the response
            return self._structure_lesson_plan(lesson_plan)

        except json.JSONDecodeError as e:
            raise GeminiAPIError(f"Failed to parse Gemini response: {str(e)}")
        except Exception as e:
            raise GeminiAPIError(f"Gemini API error: {str(e)}")

    @staticmethod
    def _structure_lesson_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and structure the lesson plan for database storage.

        Args:
            plan: Raw lesson plan from Gemini

        Returns:
            Structured plan ready for saving to database
        """
        # Extract momentos from secuencia_didactica
        secuencia = plan.get("secuencia_didactica", {})

        structured = {
            "momentos": [
                {
                    "nombre": "Inicio",
                    "order": 1,
                    "duration_minutes": 15,
                    "content_text": secuencia.get("inicio", {}).get("descripcion", ""),
                    "recursos": secuencia.get("inicio", {}).get("recursos", []),
                    "evaluacion": secuencia.get("inicio", {}).get("evaluacion", "")
                },
                {
                    "nombre": "Desarrollo",
                    "order": 2,
                    "duration_minutes": 20,
                    "content_text": secuencia.get("desarrollo", {}).get("descripcion", ""),
                    "recursos": secuencia.get("desarrollo", {}).get("recursos", []),
                    "evaluacion": secuencia.get("desarrollo", {}).get("evaluacion", "")
                },
                {
                    "nombre": "Cierre",
                    "order": 3,
                    "duration_minutes": 10,
                    "content_text": secuencia.get("cierre", {}).get("descripcion", ""),
                    "recursos": secuencia.get("cierre", {}).get("recursos", []),
                    "evaluacion": secuencia.get("cierre", {}).get("evaluacion", "")
                }
            ],
            "mapa_cognitivo": plan.get("mapa_cognitivo", ""),
            "inteligencias_multiples": plan.get("inteligencias_multiples", []),
            "dua_neuroinclusion": plan.get("dua_neuroinclusion", {}),
            "tabla_adaptaciones": plan.get("tabla_adaptaciones", {})
        }

        return structured

    @staticmethod
    def get_fallback_plan(
        tema_clase: str,
        grado_nivel: str
    ) -> Dict[str, Any]:
        """Return a template lesson plan if Gemini fails.

        Args:
            tema_clase: Main theme
            grado_nivel: Grade level

        Returns:
            Basic template lesson plan
        """
        return {
            "momentos": [
                {
                    "nombre": "Inicio",
                    "order": 1,
                    "duration_minutes": 15,
                    "content_text": f"Introduction to {tema_clase}. Activate prior knowledge through discussion or visual prompts.",
                    "recursos": ["Whiteboard", "Markers"],
                    "evaluacion": "Quick questioning to assess baseline knowledge"
                },
                {
                    "nombre": "Desarrollo",
                    "order": 2,
                    "duration_minutes": 20,
                    "content_text": f"Core instruction on {tema_clase}. Present key concepts with examples and guided practice. Use think-pair-share for {grado_nivel} learners.",
                    "recursos": ["Textbook", "Worksheets", "Manipulatives"],
                    "evaluacion": "Formative assessment: observe student work, ask guiding questions"
                },
                {
                    "nombre": "Cierre",
                    "order": 3,
                    "duration_minutes": 10,
                    "content_text": f"Synthesis and reflection. Students summarize key learning about {tema_clase}. Collect exit tickets.",
                    "recursos": ["Exit ticket template"],
                    "evaluacion": "Exit ticket or quick quiz on {tema_clase}"
                }
            ],
            "mapa_cognitivo": f"Central concept: {tema_clase}. Connect to prior knowledge and real-world applications.",
            "inteligencias_multiples": ["Linguistic", "Logical-Mathematical", "Interpersonal"],
            "dua_neuroinclusion": {
                "principio_1_representacion": "Use multiple modalities: text, visuals, discussion",
                "principio_2_accion_expresion": "Allow written, verbal, or kinesthetic responses",
                "principio_3_motivacion_engagement": "Connect to student interests and real-world relevance"
            },
            "tabla_adaptaciones": {
                "dislexia": "Use clear, sans-serif font. Break content into chunks. Use visuals.",
                "adhd": "Use color-coding. Include movement breaks. Provide clear structure.",
                "tea": "Use predictable sequences. Provide visual schedules. Use explicit instructions.",
                "dyscalculia": "Use concrete objects. Color-code by magnitude. Use tens frames."
            }
        }
