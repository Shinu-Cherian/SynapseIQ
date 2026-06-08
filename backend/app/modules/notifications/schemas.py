from datetime import datetime
from pydantic import BaseModel, ConfigDict

# Output response schema for notifications
class NotificationResponse(BaseModel):
    id: int
    workspace_id: str
    user_id: int
    title: str
    content: str
    notification_type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
