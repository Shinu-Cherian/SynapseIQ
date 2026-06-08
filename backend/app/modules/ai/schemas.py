from pydantic import BaseModel, Field
from typing import List

# Input schema to search/query the AI Brain
class QueryRequest(BaseModel):
    question: str = Field(..., description="The question you want to ask SynapseIQ")

# Schema representing a reference source returned by vector search
class SourceReference(BaseModel):
    source_type: str # 'document', 'chat', 'meeting'
    source_id: str
    content: str

# Output response schema for AI queries
class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceReference]
