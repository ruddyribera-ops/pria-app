"""Accessibility and neuroinclusive profiles - user preferences and student needs

Revision ID: 0004_accessibility_profiles
Revises: 0003_planning_extensions
Create Date: 2026-05-07 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0004_accessibility_profiles'
down_revision = '0003_planning_extensions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create tables for Accessibility module Phase 4."""

    # Create user_profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('accessibility_profile', sa.String(), server_default='default', nullable=False),
        sa.Column('font_size_override', sa.Float(), nullable=True),
        sa.Column('color_scheme', sa.String(), server_default='light', nullable=False),
        sa.Column('reduced_motion', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('preferred_language', sa.String(), server_default='es', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_profiles_user_id'), 'user_profiles', ['user_id'], unique=True)

    # Create student_profiles table
    op.create_table(
        'student_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.Integer(), nullable=False),
        sa.Column('student_name', sa.String(), nullable=False),
        sa.Column('diagnostico', sa.String(), server_default='none', nullable=False),
        sa.Column('learning_strengths', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('accommodations', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_student_profiles_school_id'), 'student_profiles', ['school_id'], unique=False)
    op.create_index(op.f('ix_student_profiles_diagnostico'), 'student_profiles', ['diagnostico'], unique=False)


def downgrade() -> None:
    """Rollback accessibility tables."""
    op.drop_index(op.f('ix_student_profiles_diagnostico'), table_name='student_profiles')
    op.drop_index(op.f('ix_student_profiles_school_id'), table_name='student_profiles')
    op.drop_table('student_profiles')

    op.drop_index(op.f('ix_user_profiles_user_id'), table_name='user_profiles')
    op.drop_table('user_profiles')
