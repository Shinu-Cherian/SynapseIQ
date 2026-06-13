from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.meetings import schemas, services
from app.modules.meetings.models import Meeting
from app.modules.workspace.dependencies import RequireWorkspaceRole
from app.modules.workspace.models import WorkspaceMember

router = APIRouter(prefix="/workspaces/{workspace_id}/meetings", tags=["Meetings"])

@router.post("", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def schedule_meeting(
    workspace_id: str,
    meeting_in: schemas.MeetingCreate,
    db: Session = Depends(get_db),
    # Guard: Only Owner/Admin can schedule meetings
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Schedules a new meeting inside a workspace.
    """
    return services.create_meeting(
        db, 
        workspace_id=workspace_id, 
        creator_id=current_member.user_id, 
        meeting_in=meeting_in
    )

@router.get("", response_model=List[schemas.MeetingResponse])
def get_meetings(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Lists all scheduled meetings inside a workspace.
    """
    return services.get_workspace_meetings(db, workspace_id=workspace_id)

@router.post("/{meeting_id}/start", response_model=schemas.MeetingResponse)
def start_meeting(
    workspace_id: str,
    meeting_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Changes meeting status to in_progress. Only Team Heads can start.
    """
    meeting = services.get_meeting_by_id(db, meeting_id)
    if not meeting or meeting.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return services.start_meeting(db, meeting_id)

@router.post("/{meeting_id}/end", response_model=schemas.MeetingResponse)
def end_meeting(
    workspace_id: str,
    meeting_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Changes meeting status to completed.
    """
    meeting = services.get_meeting_by_id(db, meeting_id)
    if not meeting or meeting.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return services.end_meeting(db, meeting_id)

@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    workspace_id: str,
    meeting_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Deletes a scheduled meeting.
    """
    meeting = services.get_meeting_by_id(db, meeting_id)
    if not meeting or meeting.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Meeting not found")
    services.delete_meeting(db, meeting_id)
    return None

@router.put("/{meeting_id}", response_model=schemas.MeetingResponse)
def update_meeting(
    workspace_id: str,
    meeting_id: int,
    meeting_in: schemas.MeetingUpdate,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin"]))
):
    """
    Updates a scheduled meeting's time. Only Team Heads can update.
    """
    meeting = services.get_meeting_by_id(db, meeting_id)
    if not meeting or meeting.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    updated = services.update_meeting(db, workspace_id, current_member.user_id, meeting_id, meeting_in)
    return updated

@router.post("/{meeting_id}/transcript", response_model=schemas.MeetingIntelligenceResponse)
def upload_transcript(
    workspace_id: str,
    meeting_id: int,
    transcript_in: schemas.TranscriptUpload,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Uploads the raw transcription text for a meeting.
    """
    # Verify meeting belongs to workspace
    meeting = services.get_meeting_by_id(db, meeting_id)
    if not meeting or meeting.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found in this workspace"
        )
    return services.save_meeting_transcript(db, meeting_id=meeting_id, transcript_text=transcript_in.transcript)

@router.post("/{meeting_id}/summarize", response_model=schemas.MeetingIntelligenceResponse)
def trigger_ai_summary(
    workspace_id: str,
    meeting_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Triggers AI Meeting intelligence.
    Sends raw transcript to Groq Llama 3 API to generate summaries and action items.
    """
    # Verify meeting
    meeting = services.get_meeting_by_id(db, meeting_id)
    if not meeting or meeting.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found in this workspace"
        )
    return services.generate_meeting_intelligence(db, meeting_id=meeting_id)

@router.get("/{meeting_id}/intelligence", response_model=schemas.MeetingIntelligenceResponse)
def get_meeting_intelligence(
    workspace_id: str,
    meeting_id: int,
    db: Session = Depends(get_db),
    current_member: WorkspaceMember = Depends(RequireWorkspaceRole(["Owner", "Admin", "Member"]))
):
    """
    Retrieves the transcript, summary, and action items for a meeting.
    """
    # Verify meeting
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.workspace_id == workspace_id
    ).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found in this workspace"
        )
    if not meeting.note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting notes/transcript not uploaded yet."
        )
    return meeting.note
