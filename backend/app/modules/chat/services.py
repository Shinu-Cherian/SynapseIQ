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
    channels = db.query(Channel).filter(
        Channel.workspace_id == workspace_id,
        or_(
            Channel.is_private == False,
            Channel.dm_user_1_id == current_user_id,
            Channel.dm_user_2_id == current_user_id
        )
    ).all()
    
    from app.modules.chat.models import ChannelReadState, Message
    for channel in channels:
        read_state = db.query(ChannelReadState).filter(
            ChannelReadState.channel_id == channel.id,
            ChannelReadState.user_id == current_user_id
        ).first()
        
        last_read_id = read_state.last_read_message_id if read_state and read_state.last_read_message_id else 0
        
        unread_count = db.query(Message).filter(
            Message.channel_id == channel.id,
            Message.id > last_read_id
        ).count()
        
        setattr(channel, "unread_count", unread_count)
        
    return channels

def mark_channel_read(db: Session, channel_id: int, user_id: int):
    from app.modules.chat.models import ChannelReadState, Message
    last_msg = db.query(Message).filter(Message.channel_id == channel_id).order_by(Message.id.desc()).first()
    if not last_msg:
        return
        
    state = db.query(ChannelReadState).filter(
        ChannelReadState.channel_id == channel_id,
        ChannelReadState.user_id == user_id
    ).first()
    
    if not state:
        state = ChannelReadState(user_id=user_id, channel_id=channel_id, last_read_message_id=last_msg.id)
        db.add(state)
    else:
        state.last_read_message_id = last_msg.id
        
    db.commit()

def save_message(
    db: Session, 
    channel_id: int, 
    sender_id: int, 
    content: Optional[str] = None, 
    parent_id: Optional[int] = None,
    file_url: Optional[str] = None,
    file_name: Optional[str] = None,
    file_type: Optional[str] = None
) -> Message:
    """
    Saves a chat message or threaded reply to the database.
    """
    db_message = Message(
        channel_id=channel_id,
        sender_id=sender_id,
        content=content.strip() if content else None,
        parent_id=parent_id,
        file_url=file_url,
        file_name=file_name,
        file_type=file_type
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
        Message.channel_id == channel_id
    ).order_by(Message.created_at.asc()).limit(limit).all()

def get_message_thread(db: Session, parent_id: int) -> List[Message]:
    """
    Retrieves all replies belonging to a specific message thread.
    """
    return db.query(Message).filter(Message.parent_id == parent_id).order_by(Message.created_at.asc()).all()

def edit_message(db: Session, message_id: int, sender_id: int, new_content: str) -> Message:
    """
    Edits a message if the sender_id matches.
    """
    message = db.query(Message).filter(Message.id == message_id, Message.sender_id == sender_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found or unauthorized to edit")
    
    from datetime import datetime, timezone
    
    msg_created_at = message.created_at.replace(tzinfo=timezone.utc) if message.created_at.tzinfo is None else message.created_at
    diff = datetime.now(timezone.utc) - msg_created_at
    if diff.total_seconds() > 600:
        raise HTTPException(status_code=403, detail="You can only edit messages within 10 minutes of sending")
    
    message.content = new_content
    # Note: A real app might track 'is_edited' boolean or 'updated_at' timestamp
    db.commit()
    db.refresh(message)
    return message

def delete_message(db: Session, message_id: int, user_id: int, user_role: str):
    """
    Deletes a message. Sender can delete their own. Admin/Owner can delete any.
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if message.sender_id != user_id and user_role not in ["Admin", "Owner"]:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this message")
        
    db.delete(message)
    db.commit()
