"""add npi_match_candidates table; add stats JSONB to ingest_runs

stats on ingest_runs lets pipeline scripts record rich per-run metrics
(tier breakdown, conflict count, etc.) without new columns per script.

Revision ID: d2f3a1e5b8c4
Revises: c1e4f2a8b3d5
Create Date: 2026-05-12 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'd2f3a1e5b8c4'
down_revision: Union[str, Sequence[str], None] = 'c1e4f2a8b3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'ingest_runs',
        sa.Column('stats', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.create_table(
        'npi_match_candidates',
        sa.Column('site_id', sa.UUID(), nullable=False),
        sa.Column('ingest_run_id', sa.UUID(), nullable=False),
        sa.Column('candidate_npi', sa.String(length=10), nullable=False),
        sa.Column('match_tier', sa.SmallInteger(), nullable=False),
        sa.Column('match_score', sa.Numeric(precision=5, scale=4), nullable=False),
        sa.Column('matched_on', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('nppes_legal_name', sa.Text(), nullable=False),
        sa.Column('nppes_address', sa.Text(), nullable=False),
        sa.Column('nppes_city', sa.Text(), nullable=False),
        sa.Column('nppes_state', sa.Text(), nullable=False),
        sa.Column('nppes_zip5', sa.Text(), nullable=False),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column(
            'id',
            sa.UUID(),
            server_default=sa.text('gen_random_uuid()'),
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            'match_tier IN (1, 2, 3)',
            name=op.f('ck_npi_match_candidates_tier_valid'),
        ),
        sa.CheckConstraint(
            'match_score >= 0 AND match_score <= 1',
            name=op.f('ck_npi_match_candidates_score_range'),
        ),
        sa.CheckConstraint(
            "status IN ('accepted', 'pending', 'rejected', 'promoted', 'conflict')",
            name=op.f('ck_npi_match_candidates_status_valid'),
        ),
        sa.ForeignKeyConstraint(
            ['ingest_run_id'],
            ['ingest_runs.id'],
            name=op.f('fk_npi_match_candidates_ingest_run_id_ingest_runs'),
            ondelete='RESTRICT',
        ),
        sa.ForeignKeyConstraint(
            ['site_id'],
            ['sites.id'],
            name=op.f('fk_npi_match_candidates_site_id_sites'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_npi_match_candidates')),
        sa.UniqueConstraint(
            'site_id',
            'candidate_npi',
            name=op.f('uq_npi_match_candidates_site_id'),
        ),
    )
    op.create_index(
        op.f('ix_npi_match_candidates_status'),
        'npi_match_candidates',
        ['status'],
    )
    op.create_index(
        op.f('ix_npi_match_candidates_site_id'),
        'npi_match_candidates',
        ['site_id'],
    )
    op.create_index(
        op.f('ix_npi_match_candidates_candidate_npi'),
        'npi_match_candidates',
        ['candidate_npi'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_npi_match_candidates_candidate_npi'), table_name='npi_match_candidates')
    op.drop_index(op.f('ix_npi_match_candidates_site_id'), table_name='npi_match_candidates')
    op.drop_index(op.f('ix_npi_match_candidates_status'), table_name='npi_match_candidates')
    op.drop_table('npi_match_candidates')
    op.drop_column('ingest_runs', 'stats')
