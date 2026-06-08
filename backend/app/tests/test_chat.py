from app.modules.chat.models import Channel, Message

def test_channel_model():
    """
    Verifies that a Channel model can be correctly initialized.
    """
    channel = Channel(
        workspace_id="TECHNOVA-001",
        name="general",
        description="General discussions",
        is_private=False
    )
    assert channel.workspace_id == "TECHNOVA-001"
    assert channel.name == "general"
    assert channel.is_private is False

def test_message_model():
    """
    Verifies that Message models can be initialized with parent relationships for threading.
    """
    parent = Message(
        id=1,
        channel_id=1,
        sender_id=1,
        content="What is ReachFlow AI?",
    )
    
    reply = Message(
        id=2,
        channel_id=1,
        sender_id=2,
        content="ReachFlow AI is our flow-matching routing system.",
        parent_id=1
    )
    
    assert parent.content == "What is ReachFlow AI?"
    assert reply.parent_id == 1
    assert reply.content == "ReachFlow AI is our flow-matching routing system."
