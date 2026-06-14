"""add_search_indexes

Revision ID: 581ab398cf92
Revises: 6fa10345d0b1
Create Date: 2026-06-14 12:47:06.108084

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '581ab398cf92'
down_revision: Union[str, Sequence[str], None] = '6fa10345d0b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE INDEX IF NOT EXISTS idx_messages_content_trgm ON messages USING gin (content gin_trgm_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_project_tasks_title_trgm ON project_tasks USING gin (title gin_trgm_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm ON users USING gin (full_name gin_trgm_ops);")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS idx_users_full_name_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_project_tasks_title_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_messages_content_trgm;")
