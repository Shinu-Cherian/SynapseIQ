import httpx
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.modules.workspace.models import WorkspaceMember
from app.modules.projects.models import Project, ProjectTask
from app.modules.auth.models import User
from app.core.config import settings

def get_dashboard_data(db: Session, workspace_id: str) -> Dict[str, Any]:
    """
    Aggregates workspace metrics, project status ratios, and team workloads.
    """
    # 1. Count total projects and members in the workspace
    total_projects = db.query(Project).filter(Project.workspace_id == workspace_id).count()
    total_members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).count()
    
    # 2. Compile projects summaries
    projects = db.query(Project).filter(Project.workspace_id == workspace_id).all()
    projects_summary = []
    
    for project in projects:
        todo_count = db.query(ProjectTask).filter(ProjectTask.project_id == project.id, ProjectTask.status == "To Do").count()
        in_progress_count = db.query(ProjectTask).filter(ProjectTask.project_id == project.id, ProjectTask.status == "In Progress").count()
        in_review_count = db.query(ProjectTask).filter(ProjectTask.project_id == project.id, ProjectTask.status == "In Review").count()
        done_count = db.query(ProjectTask).filter(ProjectTask.project_id == project.id, ProjectTask.status == "Done").count()
        
        projects_summary.append({
            "project_id": project.id,
            "name": project.name,
            "status": project.status,
            "todo_count": todo_count,
            "in_progress_count": in_progress_count,
            "in_review_count": in_review_count,
            "done_count": done_count
        })
        
    # 3. Analyze team workload
    # Fetch all members of the workspace and their user details
    members = db.query(User, WorkspaceMember).join(
        WorkspaceMember, 
        WorkspaceMember.user_id == User.id
    ).filter(WorkspaceMember.workspace_id == workspace_id).all()
    
    team_workload = []
    for user, member in members:
        # Count active/incomplete tasks assigned to this user in this workspace
        active_tasks_count = db.query(ProjectTask).join(Project).filter(
            Project.workspace_id == workspace_id,
            ProjectTask.assignee_id == user.id,
            ProjectTask.status.in_(["To Do", "In Progress", "In Review"])
        ).count()
        
        # A user is marked overloaded if they have more than 5 active tasks
        is_overloaded = active_tasks_count > 5
        
        team_workload.append({
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "active_tasks_count": active_tasks_count,
            "is_overloaded": is_overloaded
        })
        
    total_tasks = sum(p["todo_count"] + p["in_progress_count"] + p["in_review_count"] + p["done_count"] for p in projects_summary)
    completed_tasks = sum(p["done_count"] for p in projects_summary)
    
    return {
        "total_projects": total_projects,
        "total_members": total_members,
        "projects_summary": projects_summary,
        "team_workload": team_workload,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks
    }

def generate_weekly_status_report(db: Session, workspace_id: str) -> str:
    """
    Gathers metrics and asks Groq Llama 3 to write a summary progress report for the manager.
    """
    # 1. Gather stats
    stats = get_dashboard_data(db, workspace_id)
    
    # Calculate aggregate task states across all projects
    total_todo = sum(p["todo_count"] for p in stats["projects_summary"])
    total_in_progress = sum(p["in_progress_count"] for p in stats["projects_summary"])
    total_in_review = sum(p["in_review_count"] for p in stats["projects_summary"])
    total_done = sum(p["done_count"] for p in stats["projects_summary"])
    
    # Find names of overloaded developers
    overloaded_devs = [u["full_name"] for u in stats["team_workload"] if u["is_overloaded"]]
    overloaded_str = ", ".join(overloaded_devs) if overloaded_devs else "None"
    
    # 2. Check Groq API configuration
    is_mock = (settings.GROQ_API_KEY == "your_groq_api_key_here" or not settings.GROQ_API_KEY)
    
    if is_mock:
        return (
            f"Weekly AI Report (Workspace: {workspace_id}):\n"
            f"The workspace currently manages {stats['total_projects']} projects and {stats['total_members']} members. "
            f"Overall task stats: {total_done} completed, {total_in_progress} in progress, and {total_todo} pending. "
            f"Overloaded members: {overloaded_str}. Recommended: Delegate tasks from overloaded developers to maintain speed."
        )
        
    # 3. Request summary from Groq Llama 3
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = (
        f"Workspace ID: {workspace_id}\n"
        f"Total active projects: {stats['total_projects']}\n"
        f"Total active team members: {stats['total_members']}\n"
        f"Tasks Done: {total_done}\n"
        f"Tasks In Progress: {total_in_progress}\n"
        f"Tasks In Review: {total_in_review}\n"
        f"Tasks To Do: {total_todo}\n"
        f"Overloaded Developers: {overloaded_str}\n\n"
        f"Generate a professional, 1-paragraph progress report summary for the company manager. "
        f"Highlight project status, productivity ratios, and make recommendations for overloaded members."
    )
    
    payload = {
        "model": "gpt-oss-20b",
        "messages": [
            {
                "role": "system",
                "content": "You are SynapseIQ AI Manager Dashboard Assistant. Generate concise weekly progress reports."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3
    }
    
    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=15.0)
        if response.status_code != 200:
            raise ValueError(f"Groq API error: {response.text}")
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"[ERROR calling Groq Dashboard summary]: {e}")
        return f"Weekly Progress Report: {stats['total_projects']} active projects. {total_done} tasks completed. Overloads: {overloaded_str}."
