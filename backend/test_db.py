import os
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.modules.projects.services import create_project_task, update_project_task
from app.modules.projects.schemas import TaskCreate, TaskUpdate

db = SessionLocal()
try:
    workspace_id = "HIRETRACK 001"
    # Find a project
    from app.modules.projects.models import Project
    project = db.query(Project).filter_by(workspace_id=workspace_id).first()
    if not project:
        print("No project found.")
    else:
        print(f"Testing on project {project.id}")
        # Find user
        from app.modules.workspace.models import WorkspaceMember
        member = db.query(WorkspaceMember).filter_by(workspace_id=workspace_id).first()
        
        # Create a task
        task_in = TaskCreate(title="Test task", description="Test", assignee_id=member.user_id)
        task = create_project_task(db, workspace_id, project.id, task_in, current_user_id=member.user_id)
        print(f"Task created! ID: {task.id}")
        
        # Update task
        task_update = TaskUpdate(status="In Progress")
        task = update_project_task(db, workspace_id, task.id, task_update)
        print(f"Task updated! Status: {task.status}")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
