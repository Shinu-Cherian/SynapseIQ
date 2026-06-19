import secrets
import httpx
from datetime import datetime, timedelta, timezone
from app.core.config import settings
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
    
    # 4. Create a default 'general' public channel
    from app.modules.chat.models import Channel
    general_channel = Channel(
        workspace_id=db_workspace.id,
        name="general",
        description="General group chat for everyone",
        is_private=False,
        is_dm=False
    )
    db.add(general_channel)
    
    db.commit()
    db.refresh(db_workspace)
    return db_workspace

def get_user_workspaces(db: Session, user_id: int) -> List[Workspace]:
    """
    Retrieve all workspaces a specific user belongs to.
    """
    return db.query(Workspace).join(WorkspaceMember).filter(WorkspaceMember.user_id == user_id).all()

def delete_workspace(db: Session, workspace_id: str) -> bool:
    """
    Deletes a workspace and all its cascade-related data.
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return False
    db.delete(workspace)
    db.commit()
    return True

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
    invite_in: WorkspaceInvitationCreate,
    inviter: User = None
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
        
    # 5. Create Workspace Member
    member = WorkspaceMember(
        workspace_id=invite.workspace_id,
        user_id=user.id,
        role=invite.role
    )
    db.add(member)
    
    # 6. Automatically create a DM channel between the Team Head and this member
    workspace = db.query(Workspace).filter(Workspace.id == invite.workspace_id).first()
    if workspace:
        from app.modules.chat.models import Channel
        dm_channel = Channel(
            workspace_id=invite.workspace_id,
            name=f"DM: {user.full_name}",
            description=f"Direct message with {user.full_name}",
            is_private=True,
            is_dm=True,
            dm_user_1_id=workspace.owner_id,
            dm_user_2_id=user.id
        )
        db.add(dm_channel)

    # Mark invitation as accepted
    invite.is_accepted = True
    db.commit()
    db.refresh(member)
    
    return member

def join_workspace(db: Session, workspace_id: str, email: str, full_name: str, password: str) -> WorkspaceMember:
    """
    Allows a user to join a workspace if their email was whitelisted in an invitation.
    """
    email_clean = email.lower().strip()
    
    # 1. Check if email is invited to this workspace
    invite = db.query(WorkspaceInvitation).filter(
        WorkspaceInvitation.workspace_id == workspace_id,
        WorkspaceInvitation.email == email_clean,
        WorkspaceInvitation.is_accepted == False
    ).first()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have not been invited to this workspace or your email is incorrect."
        )
        
    # 2. Check if user exists
    user = get_user_by_email(db, email_clean)
    if not user:
        user_create = UserCreate(
            email=email_clean,
            full_name=full_name,
            password=password
        )
        user = register_user(db, user_create)
        user.is_verified = True
        db.commit()
        
    # 3. Check if already a member
    existing_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id
    ).first()
    
    if existing_member:
        invite.is_accepted = True
        db.commit()
        return existing_member
        
    # 4. Join workspace
    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user.id,
        role=invite.role
    )
    db.add(member)
    
    # 5. Automatically create a DM channel between the Team Head and this member
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace:
        from app.modules.chat.models import Channel
        dm_channel = Channel(
            workspace_id=workspace_id,
            name=f"DM: {user.full_name}",
            description=f"Direct message with {user.full_name}",
            is_private=True,
            is_dm=True,
            dm_user_1_id=workspace.owner_id,
            dm_user_2_id=user.id
        )
        db.add(dm_channel)
    
    invite.is_accepted = True
    db.commit()
    db.refresh(member)
    
    return member

def remove_workspace_member(db: Session, workspace_id: str, user_id: int) -> bool:
    """
    Removes a member from a workspace and deletes their user account to free up the email.
    Returns True if successful.
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
        
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user) # Cascades to WorkspaceMember
    else:
        db.delete(membership)
        
    db.commit()
    return True

import string
import random

def add_workspace_member_direct(db: Session, workspace_id: str, full_name: str, email: str, role: str) -> dict:
    email_clean = email.lower().strip()
    
    # 1. Check if user already exists
    user = get_user_by_email(db, email_clean)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email already exists in the system. They must be removed from their previous workspace first."
        )
        
    # 2. Generate random 6 character password
    generated_password = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    
    # 3. Create User
    user_create = UserCreate(
        email=email_clean,
        full_name=full_name,
        password=generated_password
    )
    user = register_user(db, user_create)
    user.is_verified = True
    db.commit()
    
    # 4. Create WorkspaceMember with status Pending
    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user.id,
        role=role,
        status="Pending Approval"
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    
    return {
        "member": member,
        "generated_password": generated_password
    }

def approve_workspace_member(db: Session, workspace_id: str, user_id: int) -> bool:
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    
    if not member:
        return False
        
    member.status = "Active"
    
    # Automatically create a DM channel between the Owner and this member
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace:
        from app.modules.chat.models import Channel
        # Check if DM already exists just in case
        existing_dm = db.query(Channel).filter(
            Channel.workspace_id == workspace_id,
            Channel.is_dm == True,
            ((Channel.dm_user_1_id == workspace.owner_id) & (Channel.dm_user_2_id == user_id)) |
            ((Channel.dm_user_1_id == user_id) & (Channel.dm_user_2_id == workspace.owner_id))
        ).first()
        if not existing_dm:
            dm_channel = Channel(
                workspace_id=workspace_id,
                name=f"DM: {user.full_name}",
                description=f"Direct message with {user.full_name}",
                is_private=True,
                is_dm=True,
                dm_user_1_id=workspace.owner_id,
                dm_user_2_id=user_id
            )
            db.add(dm_channel)

    db.commit()
    return True

def get_workspace_invitations(db: Session, workspace_id: str) -> List[WorkspaceInvitation]:
    """
    Returns all pending invitations for a workspace.
    """
    return db.query(WorkspaceInvitation).filter(
        WorkspaceInvitation.workspace_id == workspace_id,
        WorkspaceInvitation.is_accepted == False
    ).all()

def delete_workspace_invitation(db: Session, workspace_id: str, invitation_id: int) -> bool:
    """
    Deletes a specific invitation from a workspace.
    """
    invite = db.query(WorkspaceInvitation).filter(
        WorkspaceInvitation.id == invitation_id,
        WorkspaceInvitation.workspace_id == workspace_id
    ).first()
    
    if not invite:
        return False
        
    db.delete(invite)
    db.commit()
    return True
