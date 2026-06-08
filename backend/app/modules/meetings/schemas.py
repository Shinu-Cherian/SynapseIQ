from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

# Base Meeting properties
class MeetingBase(BaseModel):
    title: str = Field(..., description="Topic of the meeting")
    description: Optional[str] = None
    scheduled_at: datetime = Field(..., description="Scheduled date and time (ISO format)")
    duration_minutes: int = Field(default=30, description="Estimated meeting length in minutes")

# Schema to schedule a meeting
class MeetingCreate(MeetingBase):
    pass

# Output schema for meeting details
class MeetingResponse(MeetingBase):
    id: int
    workspace_id: str
    creator_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema to upload transcript text
class TranscriptUpload(BaseModel):
    transcript: str = Field(..., description="Raw meeting transcription text")

# Output schema for AI intelligence
class MeetingIntelligenceResponse(BaseModel):
    meeting_id: int
    transcript: Optional[str] = None
    summary: Optional[str] = None
    action_items: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
