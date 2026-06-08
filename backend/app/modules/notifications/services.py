import re
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.notifications.models import Notification
from app.modules.auth.models import User
from app.modules.workspace.models import WorkspaceMember

def create_notification(
    db: Session,
    workspace_id: str,
    user_id: int,
    title: str,
    content: str,
    notification_type: str = "general"
) -> Notification:
    """
    Creates and saves a new user notification alert.
    """
    db_notification = Notification(
        workspace_id=workspace_id,
        user_id=user_id,
        title=title,
        content=content,
        notification_type=notification_type,
        is_read=False
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_user_notifications(
    db: Session, 
    workspace_id: str, 
    user_id: int, 
    unread_only: bool = False
) -> List[Notification]:
    """
    Retrieves all notifications for a specific user, sorted by creation date.
    """
    query = db.query(Notification).filter(
        Notification.workspace_id == workspace_id,
        Notification.user_id == user_id
    )
    if unread_only:
        query = query.filter(Notification.is_read == False)
        
    return query.order_by(Notification.created_at.desc()).all()

def mark_notification_read(db: Session, notification_id: int, user_id: int) -> Notification:
    """
    Marks a single notification as read.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
        
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

def mark_all_notifications_read(db: Session, workspace_id: str, user_id: int) -> int:
    """
    Marks all unread notifications for a user as read.
    """
    unread_notifications = db.query(Notification).filter(
        Notification.workspace_id == workspace_id,
        Notification.user_id == user_id,
        Notification.is_read == False
    ).all()
    
    for notification in unread_notifications:
        notification.is_read = True
        
    db.commit()
    return len(unread_notifications)

def scan_and_trigger_mentions(
    db: Session, 
    workspace_id: str, 
    channel_name: str, 
    sender_id: int, 
    message_content: str
) -> int:
    """
    Scans chat messages for '@username' tags using regex, looks up matching
    workspace users, and auto-generates mention alerts.
    """
    # Find all words starting with '@' (e.g. '@john_doe', '@mark')
    # \w+ matches alphanumeric characters and underscores
    mentions = re.findall(r'@(\w+)', message_content)
    if not mentions:
        return 0
        
    sender = db.query(User).filter(User.id == sender_id).first()
    sender_name = sender.full_name if sender else "Someone"
    
    triggered_count = 0
    
    # Remove duplicate mention tags in same message
    unique_mentions = list(set(mentions))
    
    for username in unique_mentions:
        # Search for user whose full name contains username or email starts with it
        # E.g. @john will match 'John Doe' (ilike contains)
        target_user = db.query(User).join(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            (User.full_name.ilike(f"%{username}%")) | (User.email.ilike(f"{username}%"))
        ).first()
        
        # Don't notify the sender tagging themselves
        if target_user and target_user.id != sender_id:
            title = f"New Mention in #{channel_name}"
            content = f"{sender_name} tagged you in #{channel_name}: '{message_content}'"
            create_notification(
                db, 
                workspace_id=workspace_id, 
                user_id=target_user.id, 
                title=title, 
                content=content,
                notification_type="mention"
            )
            triggered_count += 1
            
    return triggered_count
