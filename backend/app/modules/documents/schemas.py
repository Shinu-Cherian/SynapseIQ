from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

# Output schema for document versions
class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: int
    file_size: int
    file_type: str
    changelog: Optional[str] = None
    uploaded_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Output schema for main document details
class DocumentResponse(BaseModel):
    id: int
    workspace_id: str
    title: str
    category: Optional[str] = "General"
    creator_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
