"""revert sites.npi unique constraint; restore non-unique index

HRSA site-delivery data has duplicate NPI values across sites — the same NPI
can appear at multiple physical locations for a single credentialed provider.
A unique constraint is therefore incorrect for this column.

Revision ID: b5f2c3d4e6a1
Revises: a3d2e1f8b9c0
Create Date: 2026-05-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b5f2c3d4e6a1'
down_revision: Union[str, Sequence[str], None] = 'a3d2e1f8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f('uq_sites_npi'), 'sites', type_='unique')
    op.create_index(op.f('ix_sites_npi'), 'sites', ['npi'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_sites_npi'), table_name='sites')
    op.create_unique_constraint(op.f('uq_sites_npi'), 'sites', ['npi'])
