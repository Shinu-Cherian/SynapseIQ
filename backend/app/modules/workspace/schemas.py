from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Literal, Optional

# Base Workspace properties
class WorkspaceBase(BaseModel):
    name: str

# Schema for creating a workspace
class WorkspaceCreate(WorkspaceBase):
    id: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9-]*$",
        description="Unique shorthand ID using letters, numbers and hyphens (e.g. TECHNOVA-001)",
    )

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
    status: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema for adding a member directly
class WorkspaceMemberAddDirect(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    role: Literal["Admin", "Member"] = "Member"


class WorkspaceJoinRequest(BaseModel):
    member_id: str = Field(min_length=6, max_length=32)
    password: str = Field(min_length=8, max_length=128)


class WorkspaceAccessCredentialResponse(BaseModel):
    id: int
    workspace_id: str
    member_id: str
    full_name: str
    email: EmailStr
    role: str
    status: str
    requested_user_id: Optional[int] = None
    created_at: datetime
    requested_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class WorkspaceAccessRequestResponse(WorkspaceAccessCredentialResponse):
    workspace_name: str

# Schema for inviting a member via link (deprecated/optional now)
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
