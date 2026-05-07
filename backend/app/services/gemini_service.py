"""Gemini AI service for neuroinclusive curriculum adaptations."""

import hashlib
import json
import time
import asyncio
from typing import Optional, Dict, Any
from enum import Enum
from datetime import datetime, timedelta

import google.generativeai as genai
from .errors import GeminiAPIError, RateLimitError, ContentValidationError


class NeuroDiversityProfile(str, Enum):
    """Neurodiversity profile types."""
    DYSLEXIA = "dyslexia"
    ADHD = "adhd"
    AUTISM = "autism"
    DYSCALCULIA = "dyscalculia"


class GeminiAdaptationService:
    """Service for generating neuroinclusive curriculum adaptations using Gemini API."""

    SYSTEM_PROMPTS = {
        NeuroDiversityProfile.DYSLEXIA: """You are an expert in dyslexia-friendly content adaptation.
Your role is to transform educational content to be more accessible for students with dyslexia.

Adaptation guidelines (CRITICAL):
1. Use simple words (8th-grade level vocabulary max)
2. Keep sentences SHORT (max 10 words per sentence)
3. Recommend sans-serif font (Arial, Verdana, Open Dyslexic) at 14pt minimum
4. Use line spacing of 1.5 or greater
5. NEVER use italics or underlines (use bold instead for emphasis)
6. Break content into small chunks with clear headings
7. Use bullet points instead of paragraphs
8. Include concrete examples and visual descriptions
9. Suggest visual aids and diagrams
10. Provide color-coding strategies
11. Include memory aids and mnemonics

Return adaptations in JSON format with fields: adapted_content, visual_aids_suggested, teaching_tips""",

        NeuroDiversityProfile.ADHD: """You are an expert in ADHD-friendly content adaptation.
Your role is to transform educational content for students with ADHD who benefit from structure, color, movement, and short focus periods.

Adaptation guidelines (CRITICAL):
1. Create numbered, color-coded steps
2. Use short learning chunks (5-10 minutes)
3. Start with the MOST engaging/relevant information
4. Use clear objectives and progress indicators
5. Include movement breaks and physical activities
6. Use BOLD keywords and highlight key concepts
7. Add gamification or reward elements
8. Include frequent checkpoints and self-quizzes
9. Use varied formats (text, icons, quick challenges)
10. Include transition warnings between sections
11. Add progress bars or visual counters
12. Use action verbs (stand up, clap, move...)

Return adaptations in JSON format with fields: adapted_content, engagement_strategies, checkpoint_intervals""",

        NeuroDiversityProfile.AUTISM: """You are an expert in autism-friendly content adaptation.
Your role is to transform educational content for autistic learners who value predictability, clarity, and explicit instructions.

Adaptation guidelines (CRITICAL):
1. Be EXPLICIT and LITERAL (no idioms, sarcasm, or implied meanings)
2. Use plain text ONLY (no decorative fonts or symbols unless explained)
3. Use CONSISTENT terminology throughout (define each term once)
4. Provide CLEAR EXPLICIT INSTRUCTIONS for every task
5. Use structured formats: lists, tables, flowcharts, timelines
6. Explain social context DIRECTLY (don't assume understanding)
7. Mention sensory considerations (loud sounds, bright lights, textures)
8. Provide advance warning of changes or surprises
9. Offer limited choices (3-4 options max)
10. Use predictable structure and formats
11. Group related information clearly
12. Avoid ambiguous pronouns (use names instead of 'it', 'this')

Return adaptations in JSON format with fields: adapted_content, clarity_notes, sensory_considerations""",

        NeuroDiversityProfile.DYSCALCULIA: """You are an expert in dyscalculia-friendly content adaptation.
Your role is to transform mathematical and numerical content for students who struggle with number sense and calculation fluency.

Adaptation guidelines (CRITICAL):
1. Use MONOSPACE FONT for all numbers (Courier, Courier New, Fira Code)
2. COLOR-CODE by magnitude: single digits (blue), tens (orange), hundreds (red)
3. Use tens frames and base-10 blocks visual representations
4. Use CONCRETE OBJECTS, not abstract numbers ('3 apples' not '3')
5. Minimize memorization; provide reference materials always
6. Use number lines, hundred charts, and visual grids
7. Teach estimation BEFORE exact calculation
8. Allow use of calculators for computation
9. Use manipulatives (physical or virtual)
10. Practice ONE concept thoroughly before moving forward
11. Use alternative algorithms (not standard methods)
12. Connect to real-world contexts and quantities
13. Pre-fill grids and provide templates

Return adaptations in JSON format with fields: adapted_content, visual_supports, concrete_examples""",
    }

    MAX_RETRIES = 3
    BASE_WAIT = 2  # seconds
    CACHE_TTL = 86400 * 30  # 30 days in seconds

    def __init__(self, api_key: Optional[str] = None, redis_client: Optional[Any] = None):
        """Initialize Gemini service.

        Args:
            api_key: Google Generative AI API key
            redis_client: Redis client for caching (optional)
        """
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash")
        self.redis_client = redis_client
        self.request_count = 0
        self.last_request_time = None

    def _get_cache_key(self, content: str, profile: NeuroDiversityProfile, section: str) -> str:
        """Generate cache key from content hash."""
        content_str = f"{content}:{profile.value}:{section}"
        return f"adapt:{hashlib.md5(content_str.encode()).hexdigest()}"

    async def _check_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Check Redis cache for existing adaptation."""
        if not self.redis_client:
            return None

        try:
            cached = await self.redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass  # Cache miss or Redis unavailable
        return None

    async def _set_cache(self, cache_key: str, data: Dict[str, Any]) -> None:
        """Store adaptation in Redis cache."""
        if not self.redis_client:
            return

        try:
            await self.redis_client.setex(
                cache_key,
                self.CACHE_TTL,
                json.dumps(data)
            )
        except Exception:
            pass  # Cache write failure is non-blocking

    async def _rate_limit_wait(self, retry_count: int = 0) -> None:
        """Implement exponential backoff for rate limiting."""
        if retry_count == 0:
            return

        wait_time = self.BASE_WAIT * (2 ** (retry_count - 1))
        # Cap at 32 seconds to avoid excessive delays
        wait_time = min(wait_time, 32)
        await asyncio.sleep(wait_time)

    def _validate_content(self, content: str, content_type: str) -> None:
        """Validate content before sending to Gemini."""
        if not content or not isinstance(content, str):
            raise ContentValidationError(
                "Content must be a non-empty string",
                field="content"
            )

        max_length = 4000  # Reasonable limit for curriculum content
        if len(content) > max_length:
            raise ContentValidationError(
                f"Content exceeds {max_length} characters",
                field="content"
            )

        if content_type not in ["objective", "assessment", "activity", "content", "material"]:
            raise ContentValidationError(
                f"Invalid content type: {content_type}",
                field="content_type"
            )

    async def adapt_content(
        self,
        content: str,
        content_type: str,
        profile: NeuroDiversityProfile,
        context: Optional[Dict[str, str]] = None,
        subject: Optional[str] = None,
        grade_level: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate neuroinclusive adaptation for content.

        Args:
            content: Original curriculum content
            content_type: Type of content (objective, assessment, activity, etc.)
            profile: Neurodiversity profile
            context: Additional context about the curriculum unit
            subject: Subject area (e.g., "Mathematics", "Spanish")
            grade_level: Grade level (e.g., "1ro Primaria")

        Returns:
            Dictionary with adapted content, confidence score, and metadata
        """
        self._validate_content(content, content_type)

        # Check cache first
        cache_key = self._get_cache_key(content, profile, content_type)
        cached_result = await self._check_cache(cache_key)
        if cached_result:
            return cached_result

        # Prepare prompt
        system_prompt = self.SYSTEM_PROMPTS[profile]

        user_prompt = f"""Please adapt the following {content_type} for a student with {profile.value}:

CONTENT TYPE: {content_type}
SUBJECT: {subject or 'General'}
GRADE LEVEL: {grade_level or 'Elementary'}

ORIGINAL CONTENT:
{content}

{f'CONTEXT: {json.dumps(context)}' if context else ''}

Provide the adaptation in JSON format. Be thorough and practical."""

        start_time = time.time()
        retry_count = 0

        while retry_count < self.MAX_RETRIES:
            try:
                await self._rate_limit_wait(retry_count)

                response = await asyncio.to_thread(
                    self.model.generate_content,
                    user_prompt,
                    generation_config={
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 40,
                        "max_output_tokens": 2048,
                    }
                )

                if not response or not response.text:
                    raise GeminiAPIError("Empty response from Gemini API")

                # Parse response
                response_text = response.text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]

                adapted_data = json.loads(response_text.strip())

                generation_time_ms = int((time.time() - start_time) * 1000)

                result = {
                    "profile": profile.value,
                    "content_type": content_type,
                    "original_content": content,
                    "adapted_content": adapted_data.get("adapted_content", ""),
                    "teaching_tips": adapted_data.get("teaching_tips", ""),
                    "visual_aids": adapted_data.get("visual_aids_suggested", ""),
                    "engagement_strategies": adapted_data.get("engagement_strategies", ""),
                    "clarity_notes": adapted_data.get("clarity_notes", ""),
                    "sensory_considerations": adapted_data.get("sensory_considerations", ""),
                    "visual_supports": adapted_data.get("visual_supports", ""),
                    "concrete_examples": adapted_data.get("concrete_examples", ""),
                    "ai_confidence_score": 0.85,  # Default high confidence for Gemini
                    "generation_time_ms": generation_time_ms,
                    "generated_at": datetime.utcnow().isoformat(),
                }

                # Cache the result
                await self._set_cache(cache_key, result)

                return result

            except json.JSONDecodeError as e:
                retry_count += 1
                if retry_count >= self.MAX_RETRIES:
                    # Return error fallback on JSON parse failure
                    return self._get_error_fallback()
                continue

            except Exception as e:
                if "429" in str(e) or "rate limit" in str(e).lower():
                    retry_count += 1
                    if retry_count >= self.MAX_RETRIES:
                        # Return error fallback instead of raising
                        return self._get_error_fallback()
                    continue
                else:
                    # For any other error, return fallback response
                    return self._get_error_fallback()

    async def analyze_curriculum(self, pdc_content: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze PDC content for adaptation opportunities."""
        try:
            summary = f"Analyzing PDC: {pdc_content.get('title', 'Untitled')}"
            return {
                "analysis": summary,
                "opportunities": [],
                "recommendations": [],
            }
        except Exception as e:
            raise GeminiAPIError(f"Curriculum analysis failed: {str(e)}")

    def _get_error_fallback(self) -> Dict[str, Any]:
        """Return fallback response when API fails.

        Returns:
            Dictionary with safe default values
        """
        return {
            "profile": "fallback",
            "content_type": "unknown",
            "original_content": "",
            "adapted_content": "Content unavailable. Please try again.",
            "teaching_tips": "Please try generating adaptations again.",
            "visual_aids": "",
            "engagement_strategies": "",
            "clarity_notes": "",
            "sensory_considerations": "",
            "visual_supports": "",
            "concrete_examples": "",
            "ai_confidence_score": 0.0,
            "generation_time_ms": 0,
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def batch_adapt_profiles(
        self,
        content: str,
        content_type: str,
        profiles: list = None,
        subject: Optional[str] = None,
        grade_level: Optional[str] = None,
    ) -> Dict[str, Dict[str, Any]]:
        """Generate adaptations for multiple profiles concurrently."""
        if profiles is None:
            profiles = list(NeuroDiversityProfile)

        tasks = [
            self.adapt_content(
                content=content,
                content_type=content_type,
                profile=profile,
                subject=subject,
                grade_level=grade_level,
            )
            for profile in profiles
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        return {
            profile.value: result
            for profile, result in zip(profiles, results)
            if not isinstance(result, Exception)
        }
