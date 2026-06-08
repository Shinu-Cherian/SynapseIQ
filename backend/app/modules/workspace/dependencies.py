from typing import List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.workspace.models import WorkspaceMember

class RequireWorkspaceRole:
    """
    FastAPI dependency to enforce role authorization within a specific workspace.
    Usage:
        @router.post("/projects", dependencies=[Depends(RequireWorkspaceRole(["Owner", "Admin"]))])
    """
    def __init__(self, allowed_roles: List[str]) -> None:
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        workspace_id: str, # FastAPI automatically extracts this from URL path (e.g. /workspaces/{workspace_id})
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ) -> WorkspaceMember:
        
        # 1. Query user's membership in the target workspace
        membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id
        ).first()
        
        # 2. Deny if not a member
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You are not a member of this workspace."
            )
            
        # 3. Deny if role is unauthorized
        if membership.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Required roles: {self.allowed_roles}. Current role: '{membership.role}'"
            )
            
        return membership
