from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.chat.models import Channel, Message
from app.modules.chat.schemas import ChannelCreate

def get_channel_by_id(db: Session, channel_id: int) -> Optional[Channel]:
    """
    Retrieves a channel by ID.
    """
    return db.query(Channel).filter(Channel.id == channel_id).first()

def create_channel(db: Session, workspace_id: str, channel_in: ChannelCreate) -> Channel:
    """
    Creates a new communication channel within a workspace.
    """
    # 1. Clean channel name format (e.g. general, frontend-dev)
    cleaned_name = channel_in.name.lower().replace("#", "").strip()
    
    # 2. Check duplicate channel name in same workspace
    existing = db.query(Channel).filter(
        Channel.workspace_id == workspace_id,
        Channel.name == cleaned_name
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Channel with name '#{cleaned_name}' already exists in this workspace."
        )
        
    # 3. Create channel
    db_channel = Channel(
        workspace_id=workspace_id,
        name=cleaned_name,
        description=channel_in.description,
        is_private=channel_in.is_private
    )
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)
    return db_channel

from sqlalchemy import or_

def get_workspace_channels(db: Session, workspace_id: str, current_user_id: int) -> List[Channel]:
    """
    Retrieves all public channels plus any DMs where the user is a participant.
    """
    return db.query(Channel).filter(
        Channel.workspace_id == workspace_id,
        or_(
            Channel.is_private == False,
            Channel.dm_user_1_id == current_user_id,
            Channel.dm_user_2_id == current_user_id
        )
    ).all()

def save_message(
    db: Session, 
    channel_id: int, 
    sender_id: int, 
    content: str, 
    parent_id: Optional[int] = None
) -> Message:
    """
    Saves a chat message or threaded reply to the database.
    """
    db_message = Message(
        channel_id=channel_id,
        sender_id=sender_id,
        content=content.strip(),
        parent_id=parent_id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_channel_messages(db: Session, channel_id: int, limit: int = 50) -> List[Message]:
    """
    Retrieves the chat history for a channel (only top-level messages, not replies).
    """
    return db.query(Message).filter(
        Message.channel_id == channel_id,
        Message.parent_id == None # Exclude thread replies from main channel feed
    ).order_by(Message.created_at.asc()).limit(limit).all()

def get_message_thread(db: Session, parent_id: int) -> List[Message]:
    """
    Retrieves all replies belonging to a specific message thread.
    """
    return db.query(Message).filter(Message.parent_id == parent_id).order_by(Message.created_at.asc()).all()
