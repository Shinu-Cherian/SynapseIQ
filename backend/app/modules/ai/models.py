from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String, nullable=False) # 'document', 'chat', 'meeting'
    source_id = Column(String, nullable=False) # ID of the document, channel, or meeting
    content = Column(Text, nullable=False)
    
    # 384 dimensions corresponds to standard sentence-transformers (e.g. MiniLM-L6-v2)
    embedding = Column(Vector(384), nullable=False)

    # Relationships
    workspace = relationship("Workspace")
