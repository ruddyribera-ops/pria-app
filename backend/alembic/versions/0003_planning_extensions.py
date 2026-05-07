"""Planning module extensions - weekly plans, momentos, micro-objectives, calendar

Revision ID: 0003_planning_extensions
Revises: 0002_pdc_extensions
Create Date: 2026-05-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0003_planning_extensions'
down_revision = '0002_pdc_extensions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create tables for Planning module Phase 3."""

    # Update weekly_plans table with new columns
    op.add_column('weekly_plans', sa.Column('subject', sa.String(), nullable=True))
    op.add_column('weekly_plans', sa.Column('grade_level', sa.String(), nullable=True))
    op.add_column('weekly_plans', sa.Column('status', sa.String(), nullable=False, server_default='draft'))
    op.create_index(op.f('ix_weekly_plans_pdc_id'), 'weekly_plans', ['pdc_id'], unique=False)
    op.create_index(op.f('ix_weekly_plans_created_at'), 'weekly_plans', ['created_at'], unique=False)

    # Create momentos table (Inicio, Desarrollo, Cierre)
    op.create_table(
        'momentos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('weekly_plan_id', sa.Integer(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='15'),
        sa.Column('content_text', sa.Text(), nullable=True),
        sa.Column('recursos', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('evaluacion', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['weekly_plan_id'], ['weekly_plans.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_momentos_weekly_plan_id'), 'momentos', ['weekly_plan_id'], unique=False)
    op.create_index(op.f('ix_momentos_created_at'), 'momentos', ['created_at'], unique=False)

    # Create micro_objetivos table
    op.create_table(
        'micro_objetivos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('weekly_plan_id', sa.Integer(), nullable=False),
        sa.Column('momento_id', sa.Integer(), nullable=True),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('verificable', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('completado', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('prioridad', sa.String(), nullable=False, server_default='normal'),
        sa.Column('depende_de', sa.Integer(), nullable=True),
        sa.Column('origin_week', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['weekly_plan_id'], ['weekly_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['momento_id'], ['momentos.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['depende_de'], ['micro_objetivos.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_micro_objetivos_weekly_plan_id'), 'micro_objetivos', ['weekly_plan_id'], unique=False)
    op.create_index(op.f('ix_micro_objetivos_momento_id'), 'micro_objetivos', ['momento_id'], unique=False)
    op.create_index(op.f('ix_micro_objetivos_created_at'), 'micro_objetivos', ['created_at'], unique=False)

    # Create calendario_escolar table (Las Palmas 2026 school calendar)
    op.create_table(
        'calendario_escolar',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('escuela_id', sa.Integer(), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('nombre_evento', sa.String(), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('tipo', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_calendario_escolar_fecha'), 'calendario_escolar', ['fecha'], unique=False)
    op.create_index(op.f('ix_calendario_escolar_escuela_id'), 'calendario_escolar', ['escuela_id'], unique=False)

    # Seed Las Palmas 2026 calendar data
    op.execute("""
        INSERT INTO calendario_escolar (escuela_id, fecha, nombre_evento, descripcion, tipo, created_at)
        VALUES
        (1, '2026-06-08', 'VACACIONES DE INVIERNO', 'Inicio de vacaciones de invierno', 'vacation', CURRENT_TIMESTAMP),
        (1, '2026-06-19', 'VACACIONES DE INVIERNO', 'Fin de vacaciones de invierno', 'vacation', CURRENT_TIMESTAMP),
        (1, '2026-06-17', 'Día del Maestro', 'Celebración de docentes en Bolivia', 'holiday', CURRENT_TIMESTAMP),
        (1, '2026-07-21', 'Día del Potosí', 'Festivo regional', 'holiday', CURRENT_TIMESTAMP),
        (1, '2026-08-06', 'Independencia de Bolivia', 'Fiesta patria nacional', 'holiday', CURRENT_TIMESTAMP)
    """)


def downgrade() -> None:
    """Revert Planning module extensions."""

    # Drop calendario_escolar
    op.drop_index(op.f('ix_calendario_escolar_escuela_id'), table_name='calendario_escolar')
    op.drop_index(op.f('ix_calendario_escolar_fecha'), table_name='calendario_escolar')
    op.drop_table('calendario_escolar')

    # Drop micro_objetivos
    op.drop_index(op.f('ix_micro_objetivos_created_at'), table_name='micro_objetivos')
    op.drop_index(op.f('ix_micro_objetivos_momento_id'), table_name='micro_objetivos')
    op.drop_index(op.f('ix_micro_objetivos_weekly_plan_id'), table_name='micro_objetivos')
    op.drop_table('micro_objetivos')

    # Drop momentos
    op.drop_index(op.f('ix_momentos_created_at'), table_name='momentos')
    op.drop_index(op.f('ix_momentos_weekly_plan_id'), table_name='momentos')
    op.drop_table('momentos')

    # Remove columns from weekly_plans
    op.drop_index(op.f('ix_weekly_plans_created_at'), table_name='weekly_plans')
    op.drop_index(op.f('ix_weekly_plans_pdc_id'), table_name='weekly_plans')
    op.drop_column('weekly_plans', 'status')
    op.drop_column('weekly_plans', 'grade_level')
    op.drop_column('weekly_plans', 'subject')
