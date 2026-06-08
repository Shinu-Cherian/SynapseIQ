import httpx
import json
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.meetings.models import Meeting, MeetingNote
from app.modules.meetings.schemas import MeetingCreate
from app.core.config import settings

def create_meeting(db: Session, workspace_id: str, creator_id: int, meeting_in: MeetingCreate) -> Meeting:
    """
    Schedules a new meeting inside a workspace.
    """
    db_meeting = Meeting(
        workspace_id=workspace_id,
        title=meeting_in.title,
        description=meeting_in.description,
        scheduled_at=meeting_in.scheduled_at,
        duration_minutes=meeting_in.duration_minutes,
        creator_id=creator_id
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

def get_workspace_meetings(db: Session, workspace_id: str) -> List[Meeting]:
    """
    Retrieves all scheduled meetings in a workspace.
    """
    return db.query(Meeting).filter(Meeting.workspace_id == workspace_id).order_by(Meeting.scheduled_at.asc()).all()

def get_meeting_by_id(db: Session, meeting_id: int) -> Optional[Meeting]:
    """
    Retrieves a meeting by ID.
    """
    return db.query(Meeting).filter(Meeting.id == meeting_id).first()

def save_meeting_transcript(db: Session, meeting_id: int, transcript_text: str) -> MeetingNote:
    """
    Saves/Updates the transcription text for a scheduled meeting.
    """
    # Check if a MeetingNote entry already exists
    note = db.query(MeetingNote).filter(MeetingNote.meeting_id == meeting_id).first()
    
    if not note:
        note = MeetingNote(
            meeting_id=meeting_id,
            transcript=transcript_text.strip()
        )
        db.add(note)
    else:
        note.transcript = transcript_text.strip()
        
    db.commit()
    db.refresh(note)
    return note

def generate_meeting_intelligence(db: Session, meeting_id: int) -> MeetingNote:
    """
    Calls the Groq Llama 3 API to summarize meeting transcript and extract action items.
    Gracefully falls back to mock summary template if Groq API is not configured or errors out.
    """
    # 1. Fetch meeting note
    note = db.query(MeetingNote).filter(MeetingNote.meeting_id == meeting_id).first()
    if not note or not note.transcript:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate AI intelligence: No transcript uploaded for this meeting."
        )
        
    transcript = note.transcript
    
    # 2. Check if Groq API key is valid / set up
    is_mock = (settings.GROQ_API_KEY == "your_groq_api_key_here" or not settings.GROQ_API_KEY)
    
    if is_mock:
        print("[MOCK INTERACTION] Groq API key is unconfigured. Generating fallback meeting summary...")
        note.summary = f"Mock AI Summary of meeting '{note.meeting.title}': The team aligned on sprint milestones, reviewed blockers in the login flow, and discussed scaling limitations of the SQL join operations."
        note.action_items = "- Verify bcrypt hash complexity parameters.\n- Create a Docker Compose cache-aside config for Redis.\n- Coordinate API endpoints with Next.js frontend developer."
        db.commit()
        db.refresh(note)
        return note
        
    # 3. Call Groq Llama 3 API
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama3-8b-8192", # Llama 3 model
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an expert AI meeting assistant. Summarize the following meeting transcript in 2 concise paragraphs, "
                    "and extract actionable items as a bulleted list. You MUST return your response as a valid JSON object with "
                    "exactly two fields: 'summary' (string) and 'action_items' (string, with bullet points)."
                )
            },
            {
                "role": "user",
                "content": f"Transcript:\n{transcript}"
            }
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }
    
    try:
        # Timeout after 15 seconds to prevent request hanging
        response = httpx.post(url, json=payload, headers=headers, timeout=15.0)
        
        if response.status_code != 200:
            raise ValueError(f"Groq API returned status code {response.status_code}: {response.text}")
            
        result = response.json()
        raw_json_str = result["choices"][0]["message"]["content"]
        ai_data = json.loads(raw_json_str)
        
        note.summary = ai_data.get("summary", "Summary not provided by AI.")
        note.action_items = ai_data.get("action_items", "No action items extracted.")
        db.commit()
        db.refresh(note)
        
    except Exception as e:
        print(f"[ERROR calling Groq API]: {e}. Falling back to mock templates.")
        note.summary = f"Fallback AI Summary: The team held a review of '{note.meeting.title}'. Underwent standard evaluation check tasks."
        note.action_items = "- Follow up on backend database migrations.\n- Update Alembic scripts."
        db.commit()
        db.refresh(note)
        
    return note
