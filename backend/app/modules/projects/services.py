from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.projects.models import Project, ProjectMember, ProjectTask
from app.modules.projects.schemas import ProjectCreate, ProjectMemberAssign, TaskCreate, TaskUpdate
from app.modules.workspace.models import WorkspaceMember
from app.modules.notifications.services import create_notification
from app.modules.auth.models import User

def create_project(db: Session, workspace_id: str, project_in: ProjectCreate) -> Project:
    """
    Creates a new project within a workspace.
    """
    db_project = Project(
        workspace_id=workspace_id,
        name=project_in.name,
        description=project_in.description
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_workspace_projects(db: Session, workspace_id: str) -> List[Project]:
    """
    Retrieves all projects belonging to a workspace.
    """
    return db.query(Project).filter(Project.workspace_id == workspace_id).all()

def get_project_by_id(db: Session, project_id: int) -> Optional[Project]:
    """
    Retrieves a project by its primary key ID.
    """
    return db.query(Project).filter(Project.id == project_id).first()

def assign_member_to_project(
    db: Session, 
    workspace_id: str,
    project_id: int, 
    assign_in: ProjectMemberAssign
) -> ProjectMember:
    """
    Assigns an existing workspace user to a project.
    """
    # 1. Verify that target project exists
    project = get_project_by_id(db, project_id)
    if not project or project.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this workspace"
        )
        
    # 2. Verify that target user is a member of the workspace
    workspace_membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == assign_in.user_id
    ).first()
    if not workspace_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be a member of the workspace before being assigned to a project."
        )
        
    # 3. Check if already assigned
    existing_assign = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == assign_in.user_id
    ).first()
    if existing_assign:
        return existing_assign
        
    # 4. Create assignment
    db_member = ProjectMember(
        project_id=project_id,
        user_id=assign_in.user_id
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

def create_project_task(
    db: Session, 
    workspace_id: str,
    project_id: int, 
    task_in: TaskCreate,
    current_user_id: int = None
) -> ProjectTask:
    """
    Creates a task inside a project.
    """
    # 1. Verify project
    project = get_project_by_id(db, project_id)
    if not project or project.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this workspace"
        )
        
    # 2. Verify assignee (if provided) is in the workspace
    if task_in.assignee_id:
        workspace_membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == task_in.assignee_id
        ).first()
        if not workspace_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee must be a member of the workspace."
            )
            
    # 3. Create task
    db_task = ProjectTask(
        project_id=project_id,
        title=task_in.title,
        description=task_in.description,
        assignee_id=task_in.assignee_id,
        status="To Do"
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # 4. Trigger Notification if assigned
    if task_in.assignee_id and current_user_id:
        assigner = db.query(User).filter(User.id == current_user_id).first()
        assigner_name = assigner.full_name if assigner else "Team Head"
        create_notification(
            db,
            workspace_id=workspace_id,
            user_id=task_in.assignee_id,
            title=f"New Task Assigned: {task_in.title}",
            content=f"{assigner_name} assigned you a new task in '{project.name}'.",
            notification_type="general"
        )

    return db_task

def get_project_tasks(db: Session, workspace_id: str, project_id: int) -> List[ProjectTask]:
    """
    Retrieves all tasks for a project.
    """
    project = get_project_by_id(db, project_id)
    if not project or project.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this workspace"
        )
    return db.query(ProjectTask).filter(ProjectTask.project_id == project_id).all()

def update_project_task(
    db: Session, 
    workspace_id: str, 
    task_id: int, 
    task_update: TaskUpdate
) -> ProjectTask:
    """
    Updates status or assignee of a task.
    """
    # 1. Fetch task
    db_task = db.query(ProjectTask).join(Project).filter(
        ProjectTask.id == task_id,
        Project.workspace_id == workspace_id
    ).first()
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found in this workspace"
        )
        
    # 2. Update status if provided
    if task_update.status:
        valid_statuses = ["To Do", "In Progress", "In Review", "Done"]
        if task_update.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid task status. Must be one of {valid_statuses}"
            )
        db_task.status = task_update.status
        
    # 3. Update assignee if provided
    if task_update.assignee_id is not None:
        # Check if user is in workspace
        workspace_membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == task_update.assignee_id
        ).first()
        if not workspace_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee must be a member of the workspace."
            )
        db_task.assignee_id = task_update.assignee_id
        
    db.commit()
    db.refresh(db_task)
    return db_task
