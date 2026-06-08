from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

# Base Project Schema
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

# Input schema to create a project
class ProjectCreate(ProjectBase):
    pass

# Output schema for project details
class ProjectResponse(ProjectBase):
    id: int
    workspace_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema to assign member to project
class ProjectMemberAssign(BaseModel):
    user_id: int

# Output schema for project member assignment
class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Base Task Schema
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None

# Input schema to create a task
class TaskCreate(TaskBase):
    assignee_id: Optional[int] = None

# Output schema for task details
class TaskResponse(TaskBase):
    id: int
    project_id: int
    status: str
    assignee_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema to update task details
class TaskUpdate(BaseModel):
    status: Optional[str] = Field(default=None, description="To Do, In Progress, In Review, Done")
    assignee_id: Optional[int] = None
