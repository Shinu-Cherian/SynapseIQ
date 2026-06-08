from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List

# Base Channel properties
class ChannelBase(BaseModel):
    name: str = Field(..., description="Name of the channel, e.g. #general")
    description: Optional[str] = None
    is_private: bool = False

# Schema to create a channel
class ChannelCreate(ChannelBase):
    pass

# Schema to return channel details
class ChannelResponse(ChannelBase):
    id: int
    workspace_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Base Message properties
class MessageBase(BaseModel):
    content: str
    parent_id: Optional[int] = Field(default=None, description="ID of parent message if replying to a thread")

# Schema to create a message
class MessageCreate(MessageBase):
    pass

# Schema to return message details
class MessageResponse(MessageBase):
    id: int
    channel_id: int
    sender_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema representing a message thread
class ThreadResponse(BaseModel):
    parent: MessageResponse
    replies: List[MessageResponse]
