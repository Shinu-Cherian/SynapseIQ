from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.notifications import schemas, services
from app.modules.workspace.dependencies import RequireWorkspaceRole
from app.modules.workspace.models import WorkspaceMember

router = APIRouter(prefix="/workspaces/{workspace_id}/notifications", tags=["In-App Notifications"])

@router.get("", response_model=List[schemas.NotificationResponse])
def get_my_notifications(
    workspace_id: str,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    # Guard: Workspace members only
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Retrieves the notification alerts feed for the authenticated user in this workspace.
    """
    return services.get_user_notifications(
        db, 
        workspace_id=workspace_id, 
        user_id=current_member.user_id, 
        unread_only=unread_only
    )

@router.patch("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_alert_read(
    workspace_id: str,
    notification_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Marks a specific notification alert as read.
    """
    return services.mark_notification_read(db, notification_id=notification_id, user_id=current_member.user_id)

@router.post("/read-all")
def mark_all_alerts_read(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Marks all unread alerts for the current user in this workspace as read.
    """
    read_count = services.mark_all_notifications_read(db, workspace_id=workspace_id, user_id=current_member.user_id)
    return {"message": f"Successfully marked {read_count} notifications as read."}
