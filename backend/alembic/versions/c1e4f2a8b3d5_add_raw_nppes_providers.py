"""add raw_nppes_providers staging table; extend ingest_runs with filter counters

raw_nppes_providers mirrors raw_hrsa_sites: JSONB staging with ingest_run_id
baked in from the start (no backfill migration needed).

rows_read and rows_passed_filter are nullable so existing HRSA ingest_runs rows
are unaffected.

Revision ID: c1e4f2a8b3d5
Revises: b5f2c3d4e6a1
Create Date: 2026-05-12 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'c1e4f2a8b3d5'
down_revision: Union[str, Sequence[str], None] = 'b5f2c3d4e6a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('ingest_runs', sa.Column('rows_read', sa.Integer(), nullable=True))
    op.add_column('ingest_runs', sa.Column('rows_passed_filter', sa.Integer(), nullable=True))

    op.create_table(
        'raw_nppes_providers',
        sa.Column('source_file', sa.Text(), nullable=False),
        sa.Column(
            'ingest_run_id',
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            'ingested_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'raw_data',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            'id',
            sa.UUID(),
            server_default=sa.text('gen_random_uuid()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['ingest_run_id'],
            ['ingest_runs.id'],
            name=op.f('fk_raw_nppes_providers_ingest_run_id_ingest_runs'),
            ondelete='RESTRICT',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_raw_nppes_providers')),
    )
    op.create_index(
        'ix_raw_nppes_providers_source_ingested',
        'raw_nppes_providers',
        ['source_file', 'ingested_at'],
        unique=False,
    )
    op.create_index(
        'ix_raw_nppes_providers_source_ingest_run',
        'raw_nppes_providers',
        ['source_file', 'ingest_run_id'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_raw_nppes_providers_source_ingest_run', table_name='raw_nppes_providers')
    op.drop_index('ix_raw_nppes_providers_source_ingested', table_name='raw_nppes_providers')
    op.drop_table('raw_nppes_providers')
    op.drop_column('ingest_runs', 'rows_passed_filter')
    op.drop_column('ingest_runs', 'rows_read')
