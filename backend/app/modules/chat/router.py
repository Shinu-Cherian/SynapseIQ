from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.core.database import get_db
from app.core.config import settings
from app.modules.chat import schemas, services
from app.modules.chat.websocket_manager import manager
from app.modules.workspace.dependencies import RequireWorkspaceRole
from app.modules.workspace.models import WorkspaceMember
from app.modules.notifications.services import scan_and_trigger_mentions

router = APIRouter(prefix="/workspaces/{workspace_id}/channels", tags=["Chat & Channels"])

# Helper to authenticate user from query token in WebSockets
def get_ws_user_id(db: Session, token: str) -> int:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            raise ValueError()
        return int(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="WebSocket connection unauthorized: Invalid Token"
        )

@router.post("", response_model=schemas.ChannelResponse, status_code=status.HTTP_201_CREATED)
def create_channel(
    workspace_id: str,
    channel_in: schemas.ChannelCreate,
    db: Session = Depends(get_db),
    # Guard: Only Owners and Admins can create chat channels
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Creates a new public or private communication channel.
    Requires 'Owner' or 'Admin' workspace permissions.
    """
    return services.create_channel(db, workspace_id=workspace_id, channel_in=channel_in)

@router.get("", response_model=List[schemas.ChannelResponse])
def get_channels(
    workspace_id: str,
    db: Session = Depends(get_db),
    # Guard: Any active member can view channels
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Retrieves all channels the user has access to.
    """
    return services.get_workspace_channels(db, workspace_id=workspace_id, current_user_id=current_member.user_id)

@router.get("/{channel_id}/messages", response_model=List[schemas.MessageResponse])
def get_messages(
    workspace_id: str,
    channel_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    # Guard: Workspace members only
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Retrieves top-level message history for a channel.
    Excludes thread replies.
    """
    # Verify channel belongs to workspace
    channel = services.get_channel_by_id(db, channel_id)
    if not channel or channel.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found in this workspace"
        )
    return services.get_channel_messages(db, channel_id=channel_id, limit=limit)

@router.get("/{channel_id}/messages/{message_id}/thread", response_model=schemas.ThreadResponse)
def get_thread(
    workspace_id: str,
    channel_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Retrieves a message and all its threaded replies.
    """
    # 1. Fetch parent message
    parent_message = db.query(services.Message).filter(
        services.Message.id == message_id,
        services.Message.channel_id == channel_id
    ).first()
    if not parent_message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent message not found in this channel"
        )
        
    # 2. Fetch replies
    replies = services.get_message_thread(db, parent_id=message_id)
    
    return {
        "parent": parent_message,
        "replies": replies
    }

@router.websocket("/{channel_id}/ws")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    workspace_id: str,
    channel_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Real-time WebSocket endpoint for channel chat.
    Validates token and workspace membership before accepting connection.
    Supports regular messages and threaded replies.
    """
    # 1. Authenticate user from query parameter
    try:
        user_id = get_ws_user_id(db, token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Verify workspace membership
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    if not membership:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 3. Verify channel belongs to workspace
    channel = services.get_channel_by_id(db, channel_id)
    if not channel or channel.workspace_id != workspace_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 4. Accept websocket connection & register to websocket manager
    await manager.connect(websocket, channel_id)
    try:
        while True:
            # Receive message payload
            # Expecting JSON: {"content": "Hello World", "parent_id": null}
            data = await websocket.receive_json()
            content = data.get("content")
            parent_id = data.get("parent_id")
            
            if not content or not content.strip():
                continue
                
            # 5. Save message to PostgreSQL
            message = services.save_message(
                db, 
                channel_id=channel_id, 
                sender_id=user_id, 
                content=content, 
                parent_id=parent_id
            )
            
            # Scan and trigger in-app notifications if users are tagged (e.g. @john)
            try:
                scan_and_trigger_mentions(
                    db,
                    workspace_id=workspace_id,
                    channel_name=channel.name,
                    sender_id=user_id,
                    message_content=content
                )
            except Exception as e:
                print(f"[ERROR scanning mentions in WS]: {e}")
            
            # 6. Broadcast real-time JSON payload to all connections in the channel
            broadcast_payload = {
                "id": message.id,
                "channel_id": message.channel_id,
                "sender_id": message.sender_id,
                "content": message.content,
                "parent_id": message.parent_id,
                "created_at": message.created_at.isoformat()
            }
            await manager.broadcast_to_channel(broadcast_payload, channel_id)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel_id)
    except Exception:
        manager.disconnect(websocket, channel_id)
