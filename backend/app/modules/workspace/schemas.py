from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional

# Base Workspace properties
class WorkspaceBase(BaseModel):
    name: str

# Schema for creating a workspace
class WorkspaceCreate(WorkspaceBase):
    id: str = Field(..., description="Unique shorthand ID for workspace (e.g. TECHNOVA-001)")

# Schema to return workspace details
class WorkspaceResponse(WorkspaceBase):
    id: str
    owner_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema for listing workspace members
class WorkspaceMemberResponse(BaseModel):
    user_id: int
    email: EmailStr
    full_name: str
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema for inviting a member
class WorkspaceInvitationCreate(BaseModel):
    email: EmailStr
    role: str = Field(default="Member", description="Role to assign (Admin or Member)")

# Schema to return invitation details
class WorkspaceInvitationResponse(BaseModel):
    id: int
    workspace_id: str
    email: EmailStr
    token: str
    role: str
    is_accepted: bool
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema to register & join a workspace via invite token
class WorkspaceJoin(BaseModel):
    full_name: str
    password: str

# Schema to register & join a workspace via universal link
class WorkspaceJoinEmail(BaseModel):
    email: EmailStr
    full_name: str
    password: str
