"""make sites.npi unique

Revision ID: a3d2e1f8b9c0
Revises: c9f1a2b8e4d0
Create Date: 2026-05-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a3d2e1f8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c9f1a2b8e4d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index(op.f('ix_sites_npi'), table_name='sites')
    op.create_unique_constraint(op.f('uq_sites_npi'), 'sites', ['npi'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('uq_sites_npi'), 'sites', type_='unique')
    op.create_index(op.f('ix_sites_npi'), 'sites', ['npi'], unique=False)
