from pydantic import BaseModel
from typing import List

class WorkloadStats(BaseModel):
    user_id: int
    email: str
    full_name: str
    active_tasks_count: int
    is_overloaded: bool

class ProjectSummary(BaseModel):
    project_id: int
    name: str
    status: str
    todo_count: int
    in_progress_count: int
    in_review_count: int
    done_count: int

class DashboardResponse(BaseModel):
    total_projects: int
    total_members: int
    projects_summary: List[ProjectSummary]
    team_workload: List[WorkloadStats]
    total_tasks: int
    completed_tasks: int
