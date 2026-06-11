from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True, index=True, default="General") # E.g., HR, Tech, Finance
    is_public = Column(Boolean, default=True, nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    workspace = relationship("Workspace")
    creator = relationship("User")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    viewers = relationship("DocumentViewer", back_populates="document", cascade="all, delete-orphan")

    @property
    def viewer_ids(self) -> list[int]:
        return [v.user_id for v in self.viewers]

class DocumentViewer(Base):
    __tablename__ = "document_viewers"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    document = relationship("Document", back_populates="viewers")
    user = relationship("User")

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1) # 1, 2, 3, etc.
    file_path = Column(String, nullable=False) # Local path on disk where file is stored
    file_size = Column(Integer, nullable=False) # In bytes
    file_type = Column(String, nullable=False) # MIME type: application/pdf, etc.
    changelog = Column(String, nullable=True) # Description of changes made in this version
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    document = relationship("Document", back_populates="versions")
    uploader = relationship("User")
