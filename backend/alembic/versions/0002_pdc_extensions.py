"""PDC extensions - add MESCP columns and new tables

Revision ID: 0002_pdc_extensions
Revises:
Create Date: 2026-05-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0002_pdc_extensions'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create adaptations table
    op.create_table(
        'adaptations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pdc_id', sa.Integer(), nullable=False),
        sa.Column('profile', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('approved', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pdc_id'], ['pdcs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_adaptations_created_at'), 'adaptations', ['created_at'], unique=False)
    op.create_index(op.f('ix_adaptations_pdc_id'), 'adaptations', ['pdc_id'], unique=False)

    # Create inteligencias table
    op.create_table(
        'inteligencias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pdc_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pdc_id'], ['pdcs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inteligencias_created_at'), 'inteligencias', ['created_at'], unique=False)
    op.create_index(op.f('ix_inteligencias_pdc_id'), 'inteligencias', ['pdc_id'], unique=False)

    # Create productos table
    op.create_table(
        'productos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pdc_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pdc_id'], ['pdcs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_productos_created_at'), 'productos', ['created_at'], unique=False)
    op.create_index(op.f('ix_productos_pdc_id'), 'productos', ['pdc_id'], unique=False)

    # Add MESCP columns to pdcs table
    op.add_column('pdcs', sa.Column('objetivo', sa.Text(), nullable=True))
    op.add_column('pdcs', sa.Column('contenidos', sa.Text(), nullable=True))
    op.add_column('pdcs', sa.Column('momentos', sa.Text(), nullable=True))
    op.add_column('pdcs', sa.Column('recursos', sa.Text(), nullable=True))
    op.add_column('pdcs', sa.Column('periodos', sa.Text(), nullable=True))
    op.add_column('pdcs', sa.Column('criterios', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove MESCP columns from pdcs
    op.drop_column('pdcs', 'criterios')
    op.drop_column('pdcs', 'periodos')
    op.drop_column('pdcs', 'recursos')
    op.drop_column('pdcs', 'momentos')
    op.drop_column('pdcs', 'contenidos')
    op.drop_column('pdcs', 'objetivo')

    # Drop productos table
    op.drop_index(op.f('ix_productos_pdc_id'), table_name='productos')
    op.drop_index(op.f('ix_productos_created_at'), table_name='productos')
    op.drop_table('productos')

    # Drop inteligencias table
    op.drop_index(op.f('ix_inteligencias_pdc_id'), table_name='inteligencias')
    op.drop_index(op.f('ix_inteligencias_created_at'), table_name='inteligencias')
    op.drop_table('inteligencias')

    # Drop adaptations table
    op.drop_index(op.f('ix_adaptations_pdc_id'), table_name='adaptations')
    op.drop_index(op.f('ix_adaptations_created_at'), table_name='adaptations')
    op.drop_table('adaptations')
