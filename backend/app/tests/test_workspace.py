from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.auth.models import User
from app.modules.workspace.dependencies import RequireWorkspaceRole
from app.modules.workspace.models import Workspace, WorkspaceInvitation, WorkspaceMember
from app.modules.workspace.schemas import WorkspaceMemberAddDirect

def test_workspace_model_creation():
    """
    Verifies that a Workspace database model can be initialized correctly.
    """
    workspace = Workspace(
        id="TECHNOVA-001",
        name="TechNova Engineering",
        owner_id=1
    )
    assert workspace.id == "TECHNOVA-001"
    assert workspace.name == "TechNova Engineering"
    assert workspace.owner_id == 1

def test_invitation_expiry():
    """
    Verifies that workspace invitations are marked with active expiration timestamps.
    """
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(hours=48)
    
    invitation = WorkspaceInvitation(
        workspace_id="TECHNOVA-001",
        email="test@example.com",
        token="securetoken123",
        role="Member",
        is_accepted=False,
        expires_at=expiry
    )
    
    assert invitation.email == "test@example.com"
    assert invitation.role == "Member"
    assert invitation.expires_at > now
    assert invitation.is_accepted is False


def test_pending_member_cannot_use_workspace_api():
    member = WorkspaceMember(
        workspace_id="TECHNOVA-001",
        user_id=7,
        role="Member",
        status="Pending Approval",
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = member

    with pytest.raises(HTTPException) as error:
        RequireWorkspaceRole(["Member"])(
            workspace_id="TECHNOVA-001",
            db=db,
            current_user=User(id=7),
        )

    assert error.value.status_code == 403
    assert "approve" in error.value.detail.lower()


def test_direct_add_role_is_restricted():
    with pytest.raises(ValueError):
        WorkspaceMemberAddDirect(
            full_name="Mallory Example",
            email="mallory@example.com",
            role="Owner",
        )
