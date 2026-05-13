"""add org_npi to sites

Stores the org-level NPI promoted from the NPPES pipeline. Distinct from
sites.npi which holds the site-level NPI sourced from the HRSA CSV and is
read-only from the pipeline's perspective.

Revision ID: b6c7d8e9f0a1
Revises: f1a2b3c4d5e6
Create Date: 2026-05-13 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b6c7d8e9f0a1'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'sites',
        sa.Column('org_npi', sa.String(length=10), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('sites', 'org_npi')
