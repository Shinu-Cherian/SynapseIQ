from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.workspace import schemas, services
from app.modules.workspace.dependencies import RequireWorkspaceRole
from app.modules.workspace.models import WorkspaceMember

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

@router.post("", response_model=schemas.WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    workspace_in: schemas.WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new organizational workspace.
    The creator is automatically assigned as the 'Owner' of the workspace.
    """
    return services.create_workspace(db, workspace_in=workspace_in, owner_id=current_user.id)

@router.get("", response_model=List[schemas.WorkspaceResponse])
def get_my_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all workspaces the current user belongs to.
    """
    return services.get_user_workspaces(db, user_id=current_user.id)

@router.get("/{workspace_id}", response_model=schemas.WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    # Guard: Must be a member of the workspace
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Retrieves details of a specific workspace.
    """
    workspace = services.get_workspace_by_id(db, workspace_id=workspace_id)
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace

@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    # Guard: Only Workspace Owners can delete a workspace
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner"]))
):
    """
    Deletes the entire workspace and all its data.
    """
    success = services.delete_workspace(db, workspace_id=workspace_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    return {"message": "Workspace deleted successfully"}

@router.post("/{workspace_id}/invite", response_model=schemas.WorkspaceInvitationResponse)
def invite_user(
    workspace_id: str,
    invite_in: schemas.WorkspaceInvitationCreate,
    db: Session = Depends(get_db),
    # Guard: Only Workspace Owners or Admins can invite new members
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Generates a secure invitation token for an employee.
    Requires 'Owner' or 'Admin' role in the workspace.
    """
    user = db.query(User).filter(User.id == current_member.user_id).first()
    return services.create_workspace_invitation(db, workspace_id=workspace_id, invite_in=invite_in, inviter=user)

@router.post("/join/{token}", status_code=status.HTTP_201_CREATED)
def join_workspace(
    token: str,
    join_in: schemas.WorkspaceJoin,
    db: Session = Depends(get_db)
):
    """
    Accepts invitation link token, registers user if new, and joins them to the workspace.
    """
    member = services.accept_workspace_invitation(
        db, 
        token=token, 
        full_name=join_in.full_name, 
        password=join_in.password
    )
    return {
        "message": f"Successfully joined workspace '{member.workspace_id}' with role '{member.role}'",
        "workspace_id": member.workspace_id,
        "role": member.role
    }

@router.post("/{workspace_id}/join")
def join_workspace_link(
    workspace_id: str,
    join_in: schemas.WorkspaceJoinEmail,
    db: Session = Depends(get_db)
):
    """
    Universal link join endpoint.
    """
    member = services.join_workspace(
        db,
        workspace_id=workspace_id,
        email=join_in.email,
        full_name=join_in.full_name,
        password=join_in.password
    )
    return {
        "message": f"Successfully joined workspace '{member.workspace_id}' with role '{member.role}'",
        "workspace_id": member.workspace_id,
        "role": member.role
    }

@router.get("/{workspace_id}/members", response_model=List[schemas.WorkspaceMemberResponse])
def get_members(
    workspace_id: str,
    db: Session = Depends(get_db),
    # Guard: Only active members of the workspace can view its member list
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Retrieves the list of all members in a workspace along with their roles.
    """
    return services.get_workspace_members(db, workspace_id=workspace_id)

@router.delete("/{workspace_id}/members/{user_id}")
def remove_member(
    workspace_id: str,
    user_id: int,
    db: Session = Depends(get_db),
    # Guard: Only Owner or Admin can delete members
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Removes a member from the workspace.
    - Owner can remove anyone (except self).
    - Admin can only remove normal Members.
    """
    # Fetch target user's role in this workspace
    target_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    
    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this workspace"
        )
        
    # Enforce permission hierarchy: Admin cannot delete other Admins or Owners
    if current_member.role == "Admin" and target_member.role in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Admins can only remove normal Members."
        )
        
    success = services.remove_workspace_member(db, workspace_id=workspace_id, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not remove workspace member"
        )
        
    return {"message": "Member removed successfully"}

@router.get("/{workspace_id}/invitations", response_model=List[schemas.WorkspaceInvitationResponse])
def get_invitations(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Retrieves all pending invitations.
    """
    return services.get_workspace_invitations(db, workspace_id=workspace_id)

@router.delete("/{workspace_id}/invitations/{invitation_id}")
def remove_invitation(
    workspace_id: str,
    invitation_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Deletes a pending invitation to revoke access.
    """
    success = services.delete_workspace_invitation(db, workspace_id=workspace_id, invitation_id=invitation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    return {"message": "Invitation revoked successfully"}
