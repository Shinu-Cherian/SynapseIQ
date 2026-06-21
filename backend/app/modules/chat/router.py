import os
import uuid
import shutil
import filetype
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query, File, UploadFile, Form, Request
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.core.database import get_db
from app.core.config import settings
from app.modules.chat import schemas, services
from app.modules.chat.websocket_manager import manager
from app.modules.workspace.dependencies import RequireWorkspaceRole
from app.modules.workspace.models import WorkspaceMember
from app.modules.notifications.services import scan_and_trigger_mentions
from app.core.rate_limit import limiter

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

@router.post("/{channel_id}/read", status_code=status.HTTP_200_OK)
def mark_channel_as_read(
    workspace_id: str,
    channel_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Marks the given channel as fully read for the current user.
    """
    # Verify channel belongs to workspace
    channel = services.get_channel_by_id(db, channel_id)
    if not channel or channel.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found in this workspace"
        )
        
    services.mark_channel_read(db, channel_id=channel_id, user_id=current_member.user_id)
    return {"message": "Channel marked as read"}

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

@router.put("/{channel_id}/messages/{message_id}", response_model=schemas.MessageResponse)
async def edit_message(
    workspace_id: str,
    channel_id: int,
    message_id: int,
    message_in: schemas.MessageUpdate,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Edits a message. Only the sender can edit their own message.
    """
    # Verify channel
    channel = services.get_channel_by_id(db, channel_id)
    if not channel or channel.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    msg = services.edit_message(db, message_id, current_member.user_id, message_in.content)
    
    # Broadcast edit
    await manager.broadcast_to_workspace({
        "type": "MESSAGE_EDITED",
        "channel_id": channel_id,
        "message_id": message_id,
        "content": msg.content
    }, workspace_id)
    
    return msg

@router.delete("/{channel_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    workspace_id: str,
    channel_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Deletes a message.
    """
    # Verify channel
    channel = services.get_channel_by_id(db, channel_id)
    if not channel or channel.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    services.delete_message(db, message_id, current_member.user_id, current_member.role)
    
    # Broadcast delete
    await manager.broadcast_to_workspace({
        "type": "MESSAGE_DELETED",
        "channel_id": channel_id,
        "message_id": message_id
    }, workspace_id)
    
    return None

STORAGE_DIR = os.path.join(os.getcwd(), "app_storage", "chat_files")

@router.post("/{channel_id}/messages/files", response_model=schemas.MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_message_file(
    request: Request,
    workspace_id: str,
    channel_id: int,
    content: str = Form(None),
    parent_id: int = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Uploads a file, saves it, creates a message record, and broadcasts it to WebSocket clients.
    Implements a 3-Layer Smart Security Check.
    """
    channel = services.get_channel_by_id(db, channel_id)
    if not channel or channel.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Layer 1 & 2: Read file into memory (up to 50MB) and verify signature
    MAX_SIZE = 50 * 1024 * 1024 # 50 MB
    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")
        
    kind = filetype.guess(file_bytes)
    
    # Allowed mime types list
    ALLOWED_MIMES = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", # docx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", # xlsx
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", # pptx
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "text/plain", "text/csv"
    ]
    
    # Layer 3: Validation
    # If filetype can guess it, verify it against the allowlist
    # Note: text files (like CSV/txt) might not have a magic number, so kind will be None.
    # We fallback to simple extension check for .txt, .csv, otherwise block.
    if kind is not None:
        if kind.mime not in ALLOWED_MIMES:
            raise HTTPException(status_code=415, detail=f"File type {kind.mime} is not allowed for security reasons.")
    else:
        # Fallback for plain text files which lack magic numbers
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".txt", ".csv"]:
            raise HTTPException(status_code=415, detail="Unable to verify file type, or file is not an allowed text type.")

    # 4. Upload file to S3 (or local fallback)
    from app.core.storage import storage_service
    file_url = storage_service.upload_bytes(
        file_bytes=file_bytes, 
        filename=file.filename, 
        content_type=file.content_type,
        prefix="chat/"
    )
    
    message = services.save_message(
        db,
        channel_id=channel_id,
        sender_id=current_member.user_id,
        content=content,
        parent_id=parent_id,
        file_url=file_url,
        file_name=file.filename,
        file_type=file.content_type
    )

    broadcast_payload = {
        "id": message.id,
        "channel_id": message.channel_id,
        "sender_id": message.sender_id,
        "content": message.content,
        "parent_id": message.parent_id,
        "file_url": message.file_url,
        "file_name": message.file_name,
        "file_type": message.file_type,
        "created_at": message.created_at.isoformat()
    }
    await manager.broadcast_to_workspace(broadcast_payload, workspace_id)

    return message

from fastapi.responses import FileResponse

@router.get("/{channel_id}/messages/files/{filename}")
def download_chat_file(
    workspace_id: str,
    channel_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    file_path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@router.websocket("/ws")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    workspace_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Real-time WebSocket endpoint for workspace chat.
    Validates token and workspace membership before accepting connection.
    Supports receiving messages for ANY channel the user is in.
    """
    # 1. Authenticate user from query parameter
    try:
        user_id = get_ws_user_id(db, token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    import urllib.parse
    workspace_id = urllib.parse.unquote(workspace_id)
    
    # 2. Verify workspace membership
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id,
        WorkspaceMember.status == "Active",
    ).first()
    if not membership:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 4. Accept websocket connection & register to websocket manager using workspace_id
    await manager.connect(websocket, workspace_id, user_id)
    try:
        # Send initial list of online users to the newly connected client
        online_users = await manager.get_online_users(workspace_id)
        await websocket.send_json({
            "type": "PRESENCE_SYNC",
            "online_users": online_users
        })

        while True:
            # Receive message payload
            data = await websocket.receive_json()
            
            # Handle typing indicators
            if data.get("type") == "USER_TYPING":
                channel_id = data.get("channel_id")
                if channel_id:
                    await manager.broadcast_to_workspace({
                        "type": "USER_TYPING",
                        "user_id": user_id,
                        "channel_id": channel_id
                    }, workspace_id)
                continue

            # Standard chat message handling
            content = data.get("content")
            parent_id = data.get("parent_id")
            channel_id = data.get("channel_id")
            
            if not channel_id:
                continue
                
            # Verify channel belongs to workspace
            channel = services.get_channel_by_id(db, channel_id)
            if not channel or channel.workspace_id != workspace_id:
                continue
            
            if not content or not content.strip():
                continue
                
            # 5. Save message to PostgreSQL
            message = services.save_message(
                db, 
                channel_id=channel_id, 
                sender_id=user_id, 
                content=content, 
                parent_id=parent_id,
                file_url=data.get("file_url"),
                file_name=data.get("file_name"),
                file_type=data.get("file_type")
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
            
            # 6. Broadcast real-time JSON payload to all connections in the WORKSPACE
            broadcast_payload = {
                "id": message.id,
                "channel_id": message.channel_id,
                "sender_id": message.sender_id,
                "content": message.content,
                "parent_id": message.parent_id,
                "file_url": message.file_url,
                "file_name": message.file_name,
                "file_type": message.file_type,
                "created_at": message.created_at.isoformat()
            }
            await manager.broadcast_to_workspace(broadcast_payload, workspace_id)
            
    except WebSocketDisconnect:
        await manager.disconnect(websocket, workspace_id)
    except Exception:
        await manager.disconnect(websocket, workspace_id)
