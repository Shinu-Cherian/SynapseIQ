from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.modules.workspace.models import Workspace
from app.modules.chat.models import Channel
from app.modules.auth.models import User

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Get all workspaces
workspaces = db.query(Workspace).all()

for ws in workspaces:
    # Check if a general channel exists
    existing = db.query(Channel).filter(
        Channel.workspace_id == ws.id,
        Channel.is_dm == False,
        Channel.is_private == False
    ).first()
    
    if not existing:
        print(f"Creating general channel for {ws.id}")
        general_channel = Channel(
            workspace_id=ws.id,
            name="general",
            description="General group chat for everyone",
            is_private=False,
            is_dm=False
        )
        db.add(general_channel)

db.commit()
db.close()
print("Migration completed.")
