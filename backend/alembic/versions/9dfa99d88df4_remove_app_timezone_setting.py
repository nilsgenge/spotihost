"""remove app_timezone setting

Revision ID: 9dfa99d88df4
Revises: 15267e6ffbf3
Create Date: 2026-01-21 22:45:52.062416

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9dfa99d88df4'
down_revision: Union[str, Sequence[str], None] = '15267e6ffbf3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove the timezone setting
    op.execute("DELETE FROM settings WHERE key = 'app_timezone'")


def downgrade() -> None:
    """Downgrade schema."""
    # Re-add the timezone setting if rolling back
    from sqlalchemy import table, column, String
    
    settings_table = table('settings',
        column('key', String),
        column('value', String),
        column('type', String),
        column('description', String),
        column('default_value', String)
    )
    
    op.bulk_insert(settings_table, [
        {
            'key': 'app_timezone',
            'value': 'Europe/Berlin',
            'type': 'timezone',
            'description': 'Application timezone (IANA format)',
            'default_value': 'UTC'
        }
    ])
