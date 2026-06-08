from datetime import datetime, timezone
from app.modules.meetings.models import Meeting, MeetingNote

def test_meeting_model():
    """
    Verifies that a Meeting model can be correctly initialized.
    """
    now = datetime.now(timezone.utc)
    meeting = Meeting(
        workspace_id="TECHNOVA-001",
        title="Weekly Sprint Planning",
        description="Sync on tasks",
        scheduled_at=now,
        duration_minutes=45,
        creator_id=1
    )
    assert meeting.workspace_id == "TECHNOVA-001"
    assert meeting.title == "Weekly Sprint Planning"
    assert meeting.duration_minutes == 45
    assert meeting.creator_id == 1

def test_meeting_note_model():
    """
    Verifies that a MeetingNote model can be initialized with transcription text.
    """
    note = MeetingNote(
        meeting_id=1,
        transcript="Speaker A: Let's focus on JWT security. Speaker B: Yes, let's use bcrypt.",
        summary="The team discussed auth setup.",
        action_items="- Update main dependencies"
    )
    assert note.meeting_id == 1
    assert "JWT security" in note.transcript
    assert note.summary == "The team discussed auth setup."
