from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.projects import schemas, services
from app.modules.workspace.dependencies import RequireWorkspaceRole
from app.modules.workspace.models import WorkspaceMember

router = APIRouter(prefix="/workspaces/{workspace_id}/projects", tags=["Projects"])

@router.post("", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    workspace_id: str,
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    # Guard: Only Owners and Admins can create projects
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Creates a new project within a workspace.
    Requires 'Owner' or 'Admin' role in the workspace.
    """
    return services.create_project(db, workspace_id=workspace_id, project_in=project_in)

@router.get("", response_model=List[schemas.ProjectResponse])
def get_projects(
    workspace_id: str,
    db: Session = Depends(get_db),
    # Guard: Any active workspace member can view project list
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Lists all projects inside a workspace.
    Requires user to be a member of the workspace.
    """
    return services.get_workspace_projects(db, workspace_id=workspace_id)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    workspace_id: str,
    project_id: int,
    db: Session = Depends(get_db),
    # Guard: Only Owners or Admins can delete projects
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Deletes a project from the workspace.
    Requires 'Owner' or 'Admin' role.
    """
    # Verify project belongs to workspace
    project = services.get_project_by_id(db, project_id)
    if not project or project.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this workspace"
        )
    services.delete_project(db, project_id)
    return None

@router.post("/{project_id}/assign", response_model=schemas.ProjectMemberResponse)
def assign_member(
    workspace_id: str,
    project_id: int,
    assign_in: schemas.ProjectMemberAssign,
    db: Session = Depends(get_db),
    # Guard: Only Owners or Admins can assign users to projects
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Assigns a workspace user to a project.
    Requires 'Owner' or 'Admin' role in the workspace.
    """
    return services.assign_member_to_project(
        db, 
        workspace_id=workspace_id, 
        project_id=project_id, 
        assign_in=assign_in
    )

@router.post("/{project_id}/tasks", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    workspace_id: str,
    project_id: int,
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    # Guard: Workspace owners/admins can create tasks
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Creates a task inside a workspace project.
    """
    return services.create_project_task(
        db, 
        workspace_id=workspace_id, 
        project_id=project_id, 
        task_in=task_in,
        current_user_id=current_member.user_id
    )

@router.get("/{project_id}/tasks", response_model=List[schemas.TaskResponse])
def get_tasks(
    workspace_id: str,
    project_id: int,
    db: Session = Depends(get_db),
    # Guard: Workspace users can view tasks
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Fetches all tasks belonging to a workspace project.
    """
    return services.get_project_tasks(db, workspace_id=workspace_id, project_id=project_id)

@router.patch("/tasks/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    workspace_id: str,
    task_id: int,
    task_update: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    # Guard: Workspace users can update tasks
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Updates status or assignee of a task.
    """
    return services.update_project_task(
        db, 
        workspace_id=workspace_id, 
        task_id=task_id, 
        task_update=task_update
    )
