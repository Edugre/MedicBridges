"""add raw_hrsa_sites.ingest_run_id

Revision ID: c9f1a2b8e4d0
Revises: a7c3e8d12f5b
Create Date: 2026-05-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9f1a2b8e4d0"
down_revision: Union[str, Sequence[str], None] = "a7c3e8d12f5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "raw_hrsa_sites",
        sa.Column("ingest_run_id", sa.UUID(), nullable=True),
    )
    # Tie each staging row to exactly one completed ingest run (stable batch key).
    # DISTINCT ON resolves rare duplicate (source_file, started_at) catalog rows.
    op.execute(
        """
        UPDATE raw_hrsa_sites AS r
        SET ingest_run_id = x.id
        FROM (
            SELECT DISTINCT ON (source_file, started_at)
                id, source_file, started_at
            FROM ingest_runs
            WHERE status = 'completed'
            ORDER BY
                source_file,
                started_at,
                completed_at DESC NULLS LAST,
                id DESC
        ) AS x
        WHERE r.source_file = x.source_file
          AND r.ingested_at = x.started_at;
        """
    )
    op.alter_column(
        "raw_hrsa_sites",
        "ingest_run_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
    op.create_index(
        "ix_raw_hrsa_sites_source_ingest_run",
        "raw_hrsa_sites",
        ["source_file", "ingest_run_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_raw_hrsa_sites_ingest_run_id_ingest_runs"),
        "raw_hrsa_sites",
        "ingest_runs",
        ["ingest_run_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_raw_hrsa_sites_ingest_run_id_ingest_runs"),
        "raw_hrsa_sites",
        type_="foreignkey",
    )
    op.drop_index("ix_raw_hrsa_sites_source_ingest_run", table_name="raw_hrsa_sites")
    op.drop_column("raw_hrsa_sites", "ingest_run_id")
