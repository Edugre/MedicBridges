"""add requires_review to npi_match_candidates status constraint

Conflict candidates must never be auto-promoted; they are held for human
review via a UI. The promote script now transitions conflict → requires_review
instead of auto-resolving by edit distance.

Revision ID: e5f6a7b8c9d0
Revises: d2f3a1e5b8c4
Create Date: 2026-05-13 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd2f3a1e5b8c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        op.f('ck_npi_match_candidates_status_valid'),
        'npi_match_candidates',
        type_='check',
    )
    op.create_check_constraint(
        op.f('ck_npi_match_candidates_status_valid'),
        'npi_match_candidates',
        "status IN ('accepted', 'pending', 'rejected', 'promoted', 'conflict', 'requires_review')",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f('ck_npi_match_candidates_status_valid'),
        'npi_match_candidates',
        type_='check',
    )
    op.create_check_constraint(
        op.f('ck_npi_match_candidates_status_valid'),
        'npi_match_candidates',
        "status IN ('accepted', 'pending', 'rejected', 'promoted', 'conflict')",
    )
