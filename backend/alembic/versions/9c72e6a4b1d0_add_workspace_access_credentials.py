"""add workspace access credentials

Revision ID: 9c72e6a4b1d0
Revises: 581ab398cf92
Create Date: 2026-06-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c72e6a4b1d0"
down_revision: Union[str, Sequence[str], None] = "581ab398cf92"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspace_access_credentials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("member_id", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="Member"),
        sa.Column("status", sa.String(), nullable=False, server_default="Issued"),
        sa.Column("requested_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("requested_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["requested_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workspace_access_credentials_email", "workspace_access_credentials", ["email"])
    op.create_index("ix_workspace_access_credentials_id", "workspace_access_credentials", ["id"])
    op.create_index("ix_workspace_access_credentials_member_id", "workspace_access_credentials", ["member_id"], unique=True)
    op.create_index("ix_workspace_access_credentials_requested_user_id", "workspace_access_credentials", ["requested_user_id"])
    op.create_index("ix_workspace_access_credentials_status", "workspace_access_credentials", ["status"])
    op.create_index("ix_workspace_access_credentials_workspace_id", "workspace_access_credentials", ["workspace_id"])


def downgrade() -> None:
    op.drop_table("workspace_access_credentials")
