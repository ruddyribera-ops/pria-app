"""
Celery configuration for PRIA v7 async tasks
"""
import os
from celery import Celery
from kombu import Exchange, Queue


# Create Celery app
app = Celery(
    'pria_v7',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1'),
    include=['app.tasks.planning_tasks']
)

# Configuration
app.conf.update(
    # Broker and backend settings
    broker_url=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1'),

    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,

    # Time limits (10 minutes for planning tasks)
    task_time_limit=600,  # Hard limit
    task_soft_time_limit=300,  # Soft limit for cleanup

    # Task routing - Planning tasks use high priority queue
    task_routes={
        'app.tasks.planning_tasks.*': {'queue': 'planning'}
    },

    # Queues definition
    task_queues=(
        Queue('planning', Exchange('planning'), routing_key='planning'),
        Queue('default', Exchange('default'), routing_key='default'),
    ),

    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_persistent=True,

    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)


if __name__ == '__main__':
    app.start()
