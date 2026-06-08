from datetime import datetime, timedelta, timezone
from app.modules.workspace.models import Workspace, WorkspaceInvitation

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
