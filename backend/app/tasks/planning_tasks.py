"""
Planning Module Celery Tasks
Async generation of weekly plans and supporting operations
"""
import asyncio
import logging
from typing import List, Dict, Any
from celery import Task
from sqlalchemy.ext.asyncio import AsyncSession

from app.tasks.celery_config import app
from app.database import AsyncSessionLocal
from app.models.pdc import PDC, WeeklyPlan
from app.models.momento import Momento
from app.services.planning_service import PlanningService
from app.services.motor_m1a_service import MotorM1aService
from app.services.microobjetivos_service import MicroObjetivosService

logger = logging.getLogger(__name__)


class AsyncTask(Task):
    """Task class that supports async operations."""
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3}
    retry_backoff = True
    retry_backoff_max = 600
    retry_jitter = True


@app.task(base=AsyncTask, bind=True)
def generate_weekly_plans(self, pdc_id: int) -> Dict[str, Any]:
    """
    Generate all 16 weekly plans (weeks 15-30) for a PDC.

    This task:
    1. Fetches PDC metadata
    2. For each week: calls Motor M1a to generate lesson plan
    3. Creates WeeklyPlan + 3 Momentos in database
    4. Updates progress after each week
    5. Returns summary with weeks created

    Args:
        pdc_id: PDC identifier

    Returns:
        Dict with job_id, status, weeks_created, weeks_total
    """
    try:
        # Run async logic
        result = asyncio.run(
            _generate_weekly_plans_async(self, pdc_id)
        )
        return result
    except Exception as e:
        logger.error(f"Error generating weekly plans for PDC {pdc_id}: {str(e)}")
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise


async def _generate_weekly_plans_async(task: Task, pdc_id: int) -> Dict[str, Any]:
    """Async implementation of weekly plan generation.

    Args:
        task: Celery task instance (for progress updates)
        pdc_id: PDC identifier

    Returns:
        Generation result
    """
    async with AsyncSessionLocal() as db:
        # Get PDC
        from sqlalchemy import select
        pdc_result = await db.execute(select(PDC).where(PDC.id == pdc_id))
        pdc = pdc_result.scalars().first()

        if not pdc:
            raise ValueError(f"PDC {pdc_id} not found")

        # Initialize services
        planning_service = PlanningService(db)
        motor_m1a = MotorM1aService()

        weeks_created = 0
        weeks_total = 16
        failed_weeks = []

        # Generate for weeks 15-30 (16 weeks = 1 trimester)
        for week_num in range(15, 31):
            try:
                # Update progress
                progress = int((week_num - 15) / weeks_total * 100)
                task.update_state(
                    state='PROGRESS',
                    meta={
                        'current': week_num - 14,
                        'total': weeks_total,
                        'progress': progress,
                        'message': f'Generating week {week_num - 14}/16...'
                    }
                )

                # Try to get existing plan (don't recreate)
                from sqlalchemy import select
                existing = await db.execute(
                    select(WeeklyPlan).where(
                        WeeklyPlan.pdc_id == pdc_id,
                        WeeklyPlan.week_number == week_num
                    )
                )
                if existing.scalars().first():
                    logger.info(f"Week {week_num} already exists, skipping")
                    weeks_created += 1
                    continue

                # Generate lesson plan with Motor M1a
                try:
                    lesson_plan = await motor_m1a.generate_lesson_plan(
                        grado_nivel=pdc.grade_level,
                        tema_clase=pdc.subject,
                        conceptos_clave=pdc.content.get("concepts", []) if pdc.content else [],
                        palabras_clave=pdc.content.get("keywords", []) if pdc.content else [],
                        inteligencias_sugeridas=["Linguistic", "Logical-Mathematical", "Interpersonal"],
                        diagnosticos=["General education"],
                        objetivo_general=pdc.objetivo or f"Learn {pdc.subject}",
                    )
                except Exception as e:
                    logger.warning(f"Motor M1a failed for week {week_num}, using fallback: {e}")
                    lesson_plan = MotorM1aService.get_fallback_plan(
                        tema_clase=pdc.subject,
                        grado_nivel=pdc.grade_level
                    )

                # Create weekly plan
                plan = await planning_service.create_weekly_plan(
                    pdc_id=pdc_id,
                    week_number=week_num,
                    subject=pdc.subject,
                    grade_level=pdc.grade_level,
                    status="draft"
                )

                # Create momentos
                for momento_data in lesson_plan.get("momentos", []):
                    await planning_service.add_momento(
                        plan_id=plan.id,
                        order=momento_data.get("order", 1),
                        data=type('obj', (object,), {
                            'nombre': momento_data.get('nombre'),
                            'duration_minutes': momento_data.get('duration_minutes', 15),
                            'content_text': momento_data.get('content_text'),
                            'recursos': momento_data.get('recursos', []),
                            'evaluacion': momento_data.get('evaluacion')
                        })()
                    )

                # Commit after each week
                await db.commit()
                weeks_created += 1
                logger.info(f"Week {week_num} generated successfully")

            except Exception as e:
                logger.error(f"Error generating week {week_num}: {str(e)}")
                failed_weeks.append({
                    'week': week_num,
                    'error': str(e)
                })
                await db.rollback()
                # Continue with next week (partial success)

        return {
            'job_id': task.request.id,
            'status': 'complete',
            'weeks_created': weeks_created,
            'weeks_total': weeks_total,
            'failed_weeks': failed_weeks,
            'pdc_id': pdc_id,
            'message': f'Generated {weeks_created}/{weeks_total} weeks'
        }


@app.task(base=AsyncTask, bind=True)
def copy_week_task(self, source_week_id: int, target_week_id: int) -> Dict[str, Any]:
    """
    Async task to copy a week's momentos to another week.

    Args:
        source_week_id: Source weekly plan ID
        target_week_id: Target weekly plan ID

    Returns:
        Copy result
    """
    try:
        result = asyncio.run(
            _copy_week_async(source_week_id, target_week_id)
        )
        return result
    except Exception as e:
        logger.error(f"Error copying week {source_week_id} to {target_week_id}: {str(e)}")
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise


async def _copy_week_async(source_week_id: int, target_week_id: int) -> Dict[str, Any]:
    """Async implementation of week copying.

    Args:
        source_week_id: Source weekly plan ID
        target_week_id: Target weekly plan ID

    Returns:
        Copy result
    """
    async with AsyncSessionLocal() as db:
        planning_service = PlanningService(db)

        try:
            await planning_service.copy_week(source_week_id, target_week_id)
            await db.commit()

            return {
                'status': 'success',
                'source_week_id': source_week_id,
                'target_week_id': target_week_id,
                'message': f'Copied week {source_week_id} to {target_week_id}'
            }
        except Exception as e:
            await db.rollback()
            raise


# Health check task
@app.task
def health_check():
    """Simple health check task."""
    return {'status': 'celery_ok', 'timestamp': str(asyncio.get_event_loop().time())}
