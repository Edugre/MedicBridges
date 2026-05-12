"""add ingest_runs catalog

Revision ID: a7c3e8d12f5b
Revises: f4c3fd23a27b
Create Date: 2026-05-11 19:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7c3e8d12f5b'
down_revision: Union[str, Sequence[str], None] = 'f4c3fd23a27b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'ingest_runs',
        sa.Column('source_file', sa.Text(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('bytes', sa.BigInteger(), nullable=True),
        sa.Column('file_sha256', sa.String(length=64), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column(
            'id',
            sa.UUID(),
            server_default=sa.text('gen_random_uuid()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status in ('running', 'completed', 'failed')",
            name=op.f('ck_ingest_runs_status_valid'),
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_ingest_runs')),
    )
    op.create_index(
        'ix_ingest_runs_source_file_completed_at',
        'ingest_runs',
        ['source_file', 'completed_at'],
        unique=False,
    )
    op.create_index(
        'ix_ingest_runs_source_file_started_at',
        'ingest_runs',
        ['source_file', 'started_at'],
        unique=False,
    )

    # Backfill from existing raw_hrsa_sites so the transform can resolve the
    # latest snapshot via ingest_runs immediately after deploy, without
    # requiring a re-ingest. One catalog row per (source_file, ingested_at)
    # batch present in staging.
    op.execute(
        """
        INSERT INTO ingest_runs (
            source_file, started_at, completed_at, status, row_count
        )
        SELECT
            source_file,
            ingested_at,
            ingested_at,
            'completed',
            count(*)
        FROM raw_hrsa_sites
        GROUP BY source_file, ingested_at;
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        'ix_ingest_runs_source_file_started_at', table_name='ingest_runs'
    )
    op.drop_index(
        'ix_ingest_runs_source_file_completed_at', table_name='ingest_runs'
    )
    op.drop_table('ingest_runs')
