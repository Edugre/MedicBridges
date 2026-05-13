"""add reviewed_at and reviewed_by to npi_match_candidates

Tracks provenance of manual UI decisions vs auto-promotions. Both columns are
nullable so existing rows (auto-promoted, pending, etc.) remain unaffected.

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-05-13 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'npi_match_candidates',
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'npi_match_candidates',
        sa.Column('reviewed_by', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('npi_match_candidates', 'reviewed_by')
    op.drop_column('npi_match_candidates', 'reviewed_at')
