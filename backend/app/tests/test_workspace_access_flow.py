from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest
from fastapi import HTTPException

from app.core.database import Base
from app.core.security import hash_password
from app.main import app  # noqa: F401 - registers every model on Base
from app.modules.auth.models import User
from app.modules.workspace import services
from app.modules.workspace.models import WorkspaceAccessCredential, WorkspaceMember
from app.modules.workspace.schemas import WorkspaceCreate


def test_credential_request_approval_and_workspace_deletion_preserve_accounts():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()

    owner = User(
        email="head@company.com",
        full_name="Team Head",
        hashed_password=hash_password("owner-password"),
        is_verified=True,
    )
    member_user = User(
        email="member@company.com",
        full_name="Team Member",
        hashed_password=hash_password("member-password"),
        is_verified=True,
    )
    other_user = User(
        email="other@company.com",
        full_name="Other User",
        hashed_password=hash_password("other-password"),
        is_verified=True,
    )
    db.add_all([owner, member_user, other_user])
    db.commit()

    workspace = services.create_workspace(
        db,
        WorkspaceCreate(id="FLOW-001", name="Credential Flow"),
        owner_id=owner.id,
    )
    issued = services.add_workspace_member_direct(
        db,
        workspace_id=workspace.id,
        full_name=member_user.full_name,
        email=member_user.email,
        role="Member",
    )

    assert issued["member_id"].startswith("SIQ-")
    assert "password_hash" not in issued["credential"]
    assert db.query(WorkspaceMember).filter_by(user_id=member_user.id).first() is None

    with pytest.raises(HTTPException) as wrong_email:
        services.request_workspace_access(
            db,
            member_id=issued["member_id"],
            password=issued["generated_password"],
            user=other_user,
        )
    assert wrong_email.value.status_code == 403

    request = services.request_workspace_access(
        db,
        member_id=issued["member_id"],
        password=issued["generated_password"],
        user=member_user,
    )
    assert request["status"] == "Pending Approval"

    credential = db.query(WorkspaceAccessCredential).filter_by(
        member_id=issued["member_id"]
    ).one()
    approved = services.approve_access_request(db, workspace.id, credential.id)

    assert approved["user_id"] == member_user.id
    assert db.query(WorkspaceMember).filter_by(
        workspace_id=workspace.id,
        user_id=member_user.id,
    ).one().status == "Active"
    assert db.query(WorkspaceAccessCredential).count() == 0

    assert services.delete_workspace(db, workspace.id) is True
    assert db.query(User).filter_by(id=owner.id).one()
    assert db.query(User).filter_by(id=member_user.id).one()

    db.close()
