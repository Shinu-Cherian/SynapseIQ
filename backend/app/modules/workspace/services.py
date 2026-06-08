import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.workspace.models import Workspace, WorkspaceMember, WorkspaceInvitation
from app.modules.workspace.schemas import WorkspaceCreate, WorkspaceInvitationCreate
from app.modules.auth.models import User
from app.modules.auth.services import register_user, get_user_by_email
from app.modules.auth.schemas import UserCreate

def get_workspace_by_id(db: Session, workspace_id: str) -> Optional[Workspace]:
    """
    Retrieve workspace by ID.
    """
    return db.query(Workspace).filter(Workspace.id == workspace_id).first()

def create_workspace(db: Session, workspace_in: WorkspaceCreate, owner_id: int) -> Workspace:
    """
    Creates a workspace and registers the creator as the Owner.
    """
    # 1. Check if Workspace ID is already taken
    existing = get_workspace_by_id(db, workspace_in.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workspace with ID '{workspace_in.id}' already exists."
        )
    
    # 2. Create the workspace row
    db_workspace = Workspace(
        id=workspace_in.id.upper().strip(),
        name=workspace_in.name,
        owner_id=owner_id
    )
    db.add(db_workspace)
    db.flush() # Flush to get access to workspace details before commit
    
    # 3. Add creator to membership with 'Owner' role
    membership = WorkspaceMember(
        workspace_id=db_workspace.id,
        user_id=owner_id,
        role="Owner"
    )
    db.add(membership)
    db.commit()
    db.refresh(db_workspace)
    return db_workspace

def get_user_workspaces(db: Session, user_id: int) -> List[Workspace]:
    """
    Retrieve all workspaces a specific user belongs to.
    """
    return db.query(Workspace).join(WorkspaceMember).filter(WorkspaceMember.user_id == user_id).all()

def get_workspace_members(db: Session, workspace_id: str):
    """
    Retrieve all members of a workspace along with their roles.
    """
    return db.query(
        User.id.label("user_id"),
        User.email,
        User.full_name,
        WorkspaceMember.role,
        WorkspaceMember.joined_at
    ).join(WorkspaceMember, WorkspaceMember.user_id == User.id)\
     .filter(WorkspaceMember.workspace_id == workspace_id).all()

def create_workspace_invitation(
    db: Session, 
    workspace_id: str, 
    invite_in: WorkspaceInvitationCreate
) -> WorkspaceInvitation:
    """
    Creates an invitation token and returns the details.
    """
    # 1. Generate unique invitation token
    token = secrets.token_urlsafe(32)
    # Set invitation expiry to 48 hours
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    
    db_invite = WorkspaceInvitation(
        workspace_id=workspace_id,
        email=invite_in.email.lower().strip(),
        token=token,
        role=invite_in.role,
        is_accepted=False,
        expires_at=expires_at
    )
    db.add(db_invite)
    db.commit()
    db.refresh(db_invite)
    
    # Mock sending invitation email with instructions
    print(f"\n--- [RESEND/BREVO EMAIL MOCK] ---")
    print(f"To: {db_invite.email}")
    print(f"Subject: You've been invited to join Workspace {workspace_id}!")
    print(f"Body: Hello! You have been invited to join the '{workspace_id}' workspace as a {db_invite.role}.")
    print(f"To accept, click the link below and set your password:")
    print(f"Link: http://localhost:3000/invite?token={token}")
    print(f"---------------------------------\n")
    
    return db_invite

def get_invitation_by_token(db: Session, token: str) -> Optional[WorkspaceInvitation]:
    """
    Retrieve invitation details by token.
    """
    return db.query(WorkspaceInvitation).filter(
        WorkspaceInvitation.token == token,
        WorkspaceInvitation.is_accepted == False
    ).first()

def accept_workspace_invitation(db: Session, token: str, full_name: str, password: str) -> WorkspaceMember:
    """
    Validates token, registers user if new, and joins them to the workspace.
    """
    # 1. Fetch invitation
    invite = get_invitation_by_token(db, token)
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation token is invalid or has already been accepted."
        )
    
    # 2. Check if token expired
    # Compare with aware UTC datetime
    if datetime.now(timezone.utc) > invite.expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation token has expired (expires after 48 hours)."
        )
    
    # 3. Check if user already exists
    user = get_user_by_email(db, invite.email)
    if not user:
        # Create user account automatically
        user_create = UserCreate(
            email=invite.email,
            full_name=full_name,
            password=password
        )
        user = register_user(db, user_create)
        # Mark user verified since they joined via secure invitation token
        user.is_verified = True
        db.commit()
        
    # 4. Check if already a member of this workspace
    existing_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == invite.workspace_id,
        WorkspaceMember.user_id == user.id
    ).first()
    if existing_member:
        # Mark invite accepted and return
        invite.is_accepted = True
        db.commit()
        return existing_member
        
    # 5. Join workspace member
    member = WorkspaceMember(
        workspace_id=invite.workspace_id,
        user_id=user.id,
        role=invite.role
    )
    db.add(member)
    
    # Mark invitation accepted
    invite.is_accepted = True
    db.commit()
    db.refresh(member)
    
    return member

def remove_workspace_member(db: Session, workspace_id: str, user_id: int) -> bool:
    """
    Removes a member from a workspace. Returns True if successful.
    """
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    
    if not membership:
        return False
        
    # Owner cannot be removed directly (must transfer ownership first)
    if membership.role == "Owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace Owner cannot be removed from the workspace. Transfer ownership first."
        )
        
    db.delete(membership)
    db.commit()
    return True
