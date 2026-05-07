"""Export jobs and school branding tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-07 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create export_jobs and school_branding tables"""

    # Create school_branding table (singleton)
    op.create_table(
        'school_branding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('school_name', sa.String(), nullable=False),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('header_color', sa.String(), nullable=False),
        sa.Column('footer_color', sa.String(), nullable=False),
        sa.Column('accent_color', sa.String(), nullable=False),
        sa.Column('primary_font', sa.String(), nullable=False),
        sa.Column('footer_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create export_jobs table
    op.create_table(
        'export_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('pdc_id', sa.Integer(), nullable=False),
        sa.Column('format', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=False),
        sa.Column('file_url', sa.String(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['pdc_id'], ['pdcs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for export_jobs
    op.create_index(
        'idx_export_jobs_user_id',
        'export_jobs',
        ['user_id'],
        unique=False
    )
    op.create_index(
        'idx_export_jobs_status',
        'export_jobs',
        ['status'],
        unique=False
    )
    op.create_index(
        'idx_export_jobs_created_at',
        'export_jobs',
        ['created_at'],
        unique=False
    )

    # Seed default branding record (Las Palmas)
    op.execute(
        """
        INSERT INTO school_branding
        (school_name, header_color, footer_color, accent_color, primary_font, footer_text, created_at, updated_at)
        VALUES
        ('Las Palmas', '#D52B1E', '#FDB927', '#007934', 'Arial',
         'Las Palmas School\\nLa Paz, Bolivia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    """Drop export_jobs and school_branding tables"""

    # Drop indexes
    op.drop_index('idx_export_jobs_created_at', 'export_jobs')
    op.drop_index('idx_export_jobs_status', 'export_jobs')
    op.drop_index('idx_export_jobs_user_id', 'export_jobs')

    # Drop tables
    op.drop_table('export_jobs')
    op.drop_table('school_branding')
