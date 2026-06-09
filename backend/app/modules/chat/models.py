from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    is_private = Column(Boolean, default=False, nullable=False)
    is_dm = Column(Boolean, default=False, nullable=False)
    dm_user_1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    dm_user_2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    workspace = relationship("Workspace")
    messages = relationship("Message", back_populates="channel", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    
    # Threaded Discussions Support:
    # A message can have a parent message (the message being replied to).
    parent_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    channel = relationship("Channel", back_populates="messages")
    sender = relationship("User")
    
    # Self-referential relationship for threaded replies
    parent = relationship("Message", remote_side=[id], back_populates="replies")
    replies = relationship("Message", back_populates="parent", cascade="all, delete-orphan")

