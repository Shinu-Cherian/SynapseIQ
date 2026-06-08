from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.dashboard import schemas, services
from app.modules.workspace.dependencies import RequireWorkspaceRole
from app.modules.workspace.models import WorkspaceMember

router = APIRouter(prefix="/workspaces/{workspace_id}/dashboard", tags=["Manager Intelligence Dashboard"])

@router.get("", response_model=schemas.DashboardResponse)
def get_dashboard_analytics(
    workspace_id: str,
    db: Session = Depends(get_db),
    # Guard: Only Owners and Admins can access the manager intelligence dashboard
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Retrieves workspace manager dashboard analytics, including project sprint summaries and team workloads.
    Requires 'Owner' or 'Admin' role in the workspace.
    """
    return services.get_dashboard_data(db, workspace_id=workspace_id)

@router.get("/ai-report")
def get_weekly_ai_report(
    workspace_id: str,
    db: Session = Depends(get_db),
    # Guard: Only Owners and Admins can trigger AI weekly reports
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Generates a weekly summary progress report for the manager.
    Queries workspace status metrics and parses them using the Groq Llama 3 AI model.
    """
    report = services.generate_weekly_status_report(db, workspace_id=workspace_id)
    return {"weekly_ai_report": report}
